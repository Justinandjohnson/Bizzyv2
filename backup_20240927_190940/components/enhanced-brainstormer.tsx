"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";

import { Button, Input, ScrollArea, Tabs, Progress } from "@/components/ui";

import {
  Loader,
  MessageSquare,
  Network,
  Bot,
  Search,
  Save,
  ZoomIn,
  ZoomOut,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import {
  ForceGraphMethods,
  NodeObject,
  LinkObject,
} from "react-force-graph-2d";
import { debounce } from "lodash";
import * as d3 from "d3-force";
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Node extends NodeObject {
  id: string;
  name: string;
  val: number;
  color?: string;
  expanded?: boolean;
  parentId?: string;
  depth?: number;
}

interface Link extends LinkObject {
  source: string;
  target: string;
  distance?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const MemoizedForceGraph2D = React.memo(ForceGraph2D);

const calculateNodeSize = (label: string) => {
  return Math.max(label.length * 6, 40); // Increased minimum size
};

export function EnhancedBrainstormer() {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "ai" }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [savedIdeas, setSavedIdeas] = useState<
    { idea: string; category: string }[]
  >([]);
  const [currentIdea, setCurrentIdea] = useState("");
  const [searchResults, setSearchResults] = useState("");
  const [ideaProgress, setIdeaProgress] = useState(0);
  const [industryTrends, setIndustryTrends] = useState<
    { name: string; growth: number }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAIReady, setIsAIReady] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);

  const [initialIdea, setInitialIdea] = useState("");
  const initialGraphData = {
    nodes: [
      { id: "center", name: "", val: 20 },
      { id: "node1", name: "", val: 15 },
      { id: "node2", name: "", val: 15 },
      { id: "node3", name: "", val: 15 },
      { id: "node4", name: "", val: 15 },
    ],
    links: [
      { source: "center", target: "node1" },
      { source: "center", target: "node2" },
      { source: "center", target: "node3" },
      { source: "center", target: "node4" },
    ],
  };

  const [graphData, setGraphData] = useState<GraphData>(initialGraphData);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const graphRef = useRef<ForceGraphMethods<Node, Link> | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const [linkDistances, setLinkDistances] = useState<{ [key: string]: number }>(
    {}
  );

  const [draggedLink, setDraggedLink] = useState<Link | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);

  const handleLinkDragStart = useCallback((event: MouseEvent, link: Link) => {
    setDraggedLink(link);
    setDragStartPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleLinkDragMove = useCallback(
    (event: MouseEvent) => {
      if (draggedLink && dragStartPosition) {
        const dx = event.clientX - dragStartPosition.x;
        const key = `${draggedLink.source}-${draggedLink.target}`;
        const currentDistance = linkDistances[key] || 50;
        const newDistance = Math.max(10, currentDistance + dx / 2);

        setLinkDistances((prev) => ({
          ...prev,
          [key]: newDistance,
        }));
      }
    },
    [draggedLink, dragStartPosition, linkDistances]
  );

  const handleLinkDragEnd = useCallback(() => {
    setDraggedLink(null);
    setDragStartPosition(null);
  }, []);

  useEffect(() => {
    if (draggedLink) {
      window.addEventListener("mousemove", handleLinkDragMove);
      window.addEventListener("mouseup", handleLinkDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleLinkDragMove);
      window.removeEventListener("mouseup", handleLinkDragEnd);
    };
  }, [draggedLink, handleLinkDragMove, handleLinkDragEnd]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker("/mindmap-worker.js");
      workerRef.current.onmessage = (e) => {
        if (e.data.type === "processedGraphData") {
          setGraphData(e.data.data);
        }
      };

      return () => {
        workerRef.current?.terminate();
      };
    }
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("center", null);
      graphRef.current.d3Force("charge").strength(-100);
      graphRef.current.d3Force("link").distance(50);
    }
  }, [graphData]);

  const fetchIndustryTrends = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/trends`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData.error}`
        );
      }
      const data = await response.json();
      setIndustryTrends(data.trends);
    } catch (error) {
      console.error("Error fetching industry trends:", error);
      // You might want to set an error state here to display to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() && isAIReady) {
      setIsAIReady(false);
      setIsLoading(true);
      const newMessages = [
        ...messages,
        { text: inputValue, sender: "user" as const },
      ];
      setMessages(newMessages);
      setInputValue("");
      setIdeaProgress((prev) => Math.min(prev + 10, 100));

      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: inputValue,
            context: newMessages.map((m) => m.text),
            useSearch: useSearch,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        let aiResponse = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                aiResponse += data.content;
                setMessages((prevMessages) => [
                  ...prevMessages.slice(0, -1),
                  { text: aiResponse, sender: "ai" as const },
                ]);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
        setIsAIReady(true);
        setUseSearch(false);
      }
    }
  };

  const handleSaveIdea = () => {
    if (currentIdea && selectedCategory) {
      setSavedIdeas([
        ...savedIdeas,
        { idea: currentIdea, category: selectedCategory },
      ]);
      setCurrentIdea("");
      setSelectedCategory("");
      setIdeaProgress(0);
    }
  };

  const handleSearch = async () => {
    if (currentIdea) {
      setIsLoading(true);
      setSearchResults("Searching...");
      try {
        const response = await fetch(`${API_URL}/api/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: currentIdea }),
        });
        const data = await response.json();
        setSearchResults(data.results);
      } catch (error) {
        console.error("Error searching:", error);
        setSearchResults("An error occurred while searching.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGenerateMindMap = async () => {
    if (!initialIdea.trim()) return;

    setIsLoading(true);
    try {
      const centerX = mindMapWidth / 2;
      const centerY = mindMapHeight * 0.7;
      const radius = 100;

      const centerNode = {
        id: "center",
        name: initialIdea,
        x: centerX,
        y: centerY,
        val: 30,
        fx: centerX,
        fy: centerY,
      };

      setGraphData({ nodes: [centerNode], links: [] });

      const response = await fetch(`${API_URL}/api/generate-mindmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: initialIdea }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      const subNodes = data.nodes
        .slice(0, 6)
        .map((node: Node, index: number) => {
          const angle = (2 * Math.PI * index) / 6;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
            val: 20,
          };
        });

      const links = subNodes.map((node: Node) => ({
        source: centerNode.id,
        target: node.id,
      }));

      setGraphData({ nodes: [centerNode, ...subNodes], links });
    } catch (error: any) {
      console.error("Error generating mind map:", error);
      setMessages((prev) => [
        ...prev,
        { text: `Error generating mind map: ${error.message}`, sender: "ai" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const expandNode = async (node: Node) => {
    if (node.expanded || graphData.nodes.length >= 32) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/expand-node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: node.id,
          nodeName: node.name,
          initialIdea: initialIdea,
        }),
      });
      const newData = await response.json();
      if (newData.nodes && Array.isArray(newData.nodes)) {
        const depth = node.id.split("_").length - 1 + 1;
        const angleStep = Math.PI / 6; // 30-degree angle between child nodes
        const radius = 80 / depth; // Decrease radius for deeper levels
        const startAngle = (-angleStep * (newData.nodes.length - 1)) / 2;

        const subNodes = newData.nodes.map((newNode: Node, index: number) => {
          const angle = startAngle + angleStep * index;
          return {
            ...newNode,
            id: `${node.id}_${index}`,
            x: node.x! + radius * Math.cos(angle),
            y: node.y! - radius * Math.sin(angle), // Subtract to grow upwards
            val: 15,
            parentId: node.id,
            depth: depth,
          };
        });

        const newLinks = subNodes.map((subNode: Node) => ({
          source: node.id,
          target: subNode.id,
        }));

        setGraphData((prevData) => ({
          nodes: [
            ...prevData.nodes.map((n) =>
              n.id === node.id ? { ...n, expanded: true, fx: n.x, fy: n.y } : n
            ),
            ...subNodes,
          ].slice(0, 32),
          links: [...prevData.links, ...newLinks],
        }));
      }
    } catch (error: any) {
      console.error("Error expanding node:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeIdea = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/finalize-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graphData, expandedNodes: {} }),
      });
      const data = await response.json();
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Finalized Business Idea: " + data.finalIdea, sender: "ai" },
      ]);
    } catch (error) {
      console.error("Error finalizing idea:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedHandleInitialIdeaChange = useCallback(
    debounce((value: string) => setInitialIdea(value), 300),
    []
  );

  const handleInitialIdeaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedHandleInitialIdeaChange(e.target.value);
  };

  const handleCurrentIdeaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIdea(e.target.value);
  };

  const handleInitialIdeaKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && initialIdea.trim() && !isLoading) {
      handleGenerateMindMap();
    }
  };

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.2);
    }
  };

  const memoizedGraphData = useMemo(() => graphData, [graphData]);

  const [mindMapWidth, setMindMapWidth] = useState(1200); // Default width
  const [mindMapHeight, setMindMapHeight] = useState(800); // Default height

  useEffect(() => {
    // Set the actual dimensions once the component mounts
    setMindMapWidth(window.innerWidth);
    setMindMapHeight(window.innerHeight);

    // Optional: Add event listener for window resize
    const handleResize = () => {
      setMindMapWidth(window.innerWidth);
      setMindMapHeight(window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleLinkShorten = useCallback((link: Link) => {
    setLinkDistances((prev) => {
      const currentDistance = prev[`${link.source}-${link.target}`] || 50;
      return {
        ...prev,
        [`${link.source}-${link.target}`]: currentDistance * 0.8,
      };
    });
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("link").distance((link: any) => {
        const key = `${link.source.id}-${link.target.id}`;
        return linkDistances[key] || 50;
      });
      graphRef.current.d3ReheatSimulation();
    }
  }, [linkDistances]);

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNodes((prev) => {
      const isAlreadySelected = prev.some((n) => n.id === node.id);
      if (isAlreadySelected) {
        return prev.filter((n) => n.id !== node.id);
      } else {
        return [...prev, node];
      }
    });
  }, []);

  const generateFinalIdea = async () => {
    if (selectedNodes.length === 0) {
      alert("Please select at least one node");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/generate-final-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: selectedNodes.map((node) => ({
            id: node.id,
            name: node.name,
          })),
          initialIdea,
        }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { text: `Final Business Idea: ${data.finalIdea}`, sender: "ai" },
      ]);
    } catch (error) {
      console.error("Error generating final idea:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Error generating final idea. Please try again.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source
          src="/vecteezy_twisted-gradient-color-pastel-stripes-rippling-background_2018399.mov"
          type="video/quicktime"
        />
        Your browser does not support the video tag.
      </video>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen w-full bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="container mx-auto max-w-full h-full flex flex-col">
          <Card className="flex-grow shadow-lg bg-white bg-opacity-90 backdrop-blur-sm overflow-hidden">
            <h1 className="text-3xl font-bold mb-6 text-[#2D3748] flex items-center">
              Enhanced AI Business Idea Brainstormer
              {isAIReady && <Bot className="ml-2 text-green-500" size={24} />}
            </h1>
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="chat">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="mindmap">
                  <Network className="w-4 h-4 mr-2" />
                  Mindmap
                </TabsTrigger>
                <TabsTrigger value="saved">
                  <Save className="w-4 h-4 mr-2" />
                  Saved Ideas
                </TabsTrigger>
                <TabsTrigger value="trends">
                  <Search className="w-4 h-4 mr-2" />
                  Industry Trends
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat">
                <ScrollArea className="h-[calc(100vh-200px)] w-full border rounded-md p-4 mb-4 bg-white">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${
                        message.sender === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <span
                        className={`inline-block p-2 rounded-lg ${
                          message.sender === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {message.text}
                      </span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-center items-center">
                      <Loader
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  )}
                </ScrollArea>
                <div className="flex space-x-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!isAIReady || isLoading}
                  >
                    {isLoading ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      "Send"
                    )}
                  </Button>
                  <Button
                    onClick={() => setUseSearch(!useSearch)}
                    className="ml-2"
                  >
                    {useSearch ? "Disable Search" : "Enable Search"}
                  </Button>
                </div>
                <div className="flex space-x-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Current idea..."
                    value={currentIdea}
                    onChange={handleCurrentIdeaChange}
                  />
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="entertainment">
                        Entertainment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSaveIdea}>Save Idea</Button>
                  <Button onClick={handleSearch} disabled={isLoading}>
                    Search
                  </Button>
                </div>
                <Progress value={ideaProgress} className="w-full" />
                {searchResults && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Search Results:
                    </h3>
                    <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
                      {searchResults}
                    </pre>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="mindmap">
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Enter your initial business idea and press Enter"
                    onChange={handleInitialIdeaChange}
                    onKeyPress={handleInitialIdeaKeyPress}
                  />
                  <Button
                    onClick={handleGenerateMindMap}
                    disabled={isLoading || !initialIdea.trim()}
                    className="mt-2"
                  >
                    Generate Mind Map
                  </Button>
                </div>
                <div className="flex-grow w-full relative bg-white">
                  {memoizedGraphData.nodes.length > 0 && (
                    <MemoizedForceGraph2D
                      ref={
                        graphRef as React.MutableRefObject<
                          ForceGraphMethods<Node, Link>
                        >
                      }
                      graphData={memoizedGraphData}
                      nodeLabel="name"
                      nodeColor={(node) => (node as Node).color || "#4299E1"}
                      nodeVal={(node) => (node as Node).val}
                      linkColor={() => "#CBD5E0"}
                      onNodeClick={(node) => {
                        handleNodeClick(node as Node);
                        setSelectedNodeId((node as Node).id);
                        expandNode(node as Node);
                      }}
                      width={mindMapWidth}
                      height={mindMapHeight}
                      d3AlphaDecay={0.01}
                      d3VelocityDecay={0.3}
                      cooldownTimes={100}
                      nodeRelSize={6}
                      linkWidth={2}
                      linkDirectionalParticles={2}
                      linkDirectionalParticleSpeed={0.005}
                      d3Force={(engine) => {
                        engine.force("charge").strength(-300);
                        engine
                          .force("link")
                          .distance((link: any) => {
                            const key = `${link.source.id}-${link.target.id}`;
                            return linkDistances[key] || 50;
                          })
                          .strength(1);
                        engine.force(
                          "center",
                          d3
                            .forceCenter(mindMapWidth / 2, mindMapHeight * 0.3)
                            .strength(0.05)
                        );
                        engine.force("collide", d3.forceCollide(30));
                        engine.force(
                          "y",
                          d3
                            .forceY((node: any) => {
                              const depth = node.depth || 0;
                              return mindMapHeight * 0.3 + depth * 100; // Push nodes downwards based on depth
                            })
                            .strength(0.3)
                        );
                      }}
                      linkCanvasObject={(link, ctx, globalScale) => {
                        const start = link.source as Node;
                        const end = link.target as Node;
                        const textPos = {
                          x: start.x! + (end.x! - start.x!) / 2,
                          y: start.y! + (end.y! - start.y!) / 2,
                        };

                        // Draw the link
                        ctx.beginPath();
                        ctx.moveTo(start.x!, start.y!);
                        ctx.lineTo(end.x!, end.y!);
                        ctx.strokeStyle = "#CBD5E0";
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        // Draw the handle
                        ctx.fillStyle = "orange";
                        ctx.beginPath();
                        ctx.arc(textPos.x, textPos.y, 4, 0, 2 * Math.PI);
                        ctx.fill();

                        // Draw arrows to indicate draggable direction
                        ctx.fillStyle = "#718096";
                        ctx.beginPath();
                        ctx.moveTo(textPos.x - 8, textPos.y);
                        ctx.lineTo(textPos.x - 3, textPos.y - 3);
                        ctx.lineTo(textPos.x - 3, textPos.y + 3);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.moveTo(textPos.x + 8, textPos.y);
                        ctx.lineTo(textPos.x + 3, textPos.y - 3);
                        ctx.lineTo(textPos.x + 3, textPos.y + 3);
                        ctx.fill();
                      }}
                      linkCanvasObjectMode={() => "replace"}
                      onLinkClick={(link, event) =>
                        handleLinkDragStart(event as MouseEvent, link as Link)
                      }
                      onNodeDragEnd={(node) => {
                        node.fx = node.x;
                        node.fy = node.y;
                      }}
                      nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = (node as Node).name;
                        const fontSize = 15 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(
                          (n) => n + fontSize * 1.2
                        );

                        // Calculate node size based on value
                        const nodeSize = Math.sqrt((node as Node).val) * 2;

                        // Draw bubble
                        ctx.fillStyle =
                          node.id === selectedNodeId
                            ? "#48BB78"
                            : node.id === "center"
                            ? "#FFA500" // Orange color for center node
                            : (node as Node).expanded
                            ? "#4299E1"
                            : "#718096";
                        ctx.beginPath();
                        ctx.ellipse(
                          node.x!,
                          node.y!,
                          nodeSize,
                          nodeSize,
                          0,
                          0,
                          2 * Math.PI
                        );
                        ctx.fill();

                        // Draw text
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillText(label, node.x!, node.y!);

                        // Draw expansion indicator
                        if (!(node as Node).expanded && node.id !== "center") {
                          ctx.fillStyle = "#FFFFFF";
                          ctx.beginPath();
                          ctx.moveTo(
                            node.x! + nodeSize - fontSize / 2,
                            node.y!
                          );
                          ctx.lineTo(
                            node.x! + nodeSize + fontSize / 2,
                            node.y!
                          );
                          ctx.moveTo(
                            node.x! + nodeSize,
                            node.y! - fontSize / 2
                          );
                          ctx.lineTo(
                            node.x! + nodeSize,
                            node.y! + fontSize / 2
                          );
                          ctx.stroke();
                        }

                        // Draw selection indicator
                        if (selectedNodes.some((n) => n.id === node.id)) {
                          ctx.strokeStyle = "#FF0000";
                          ctx.lineWidth = 2;
                          ctx.beginPath();
                          ctx.arc(
                            node.x!,
                            node.y!,
                            nodeSize + 2,
                            0,
                            2 * Math.PI
                          );
                          ctx.stroke();
                        }
                      }}
                    />
                  )}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                      <Loader
                        className="animate-spin text-blue-500"
                        size={48}
                      />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <Button onClick={handleZoomIn} size="sm">
                      <ZoomIn size={16} />
                    </Button>
                    <Button onClick={handleZoomOut} size="sm">
                      <ZoomOut size={16} />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleFinalizeIdea}
                  disabled={isLoading || graphData.nodes.length === 0}
                  className="mt-4"
                >
                  Finalize Business Idea
                </Button>
                <Button
                  onClick={generateFinalIdea}
                  disabled={isLoading || selectedNodes.length === 0}
                  className="mt-4"
                >
                  Generate Final Idea
                </Button>
              </TabsContent>
              <TabsContent value="saved">
                <ScrollArea className="h-[calc(100vh-200px)] w-full border rounded-md p-4">
                  {savedIdeas.map((idea, index) => (
                    <div key={index} className="mb-4 p-2 border rounded">
                      <h3 className="font-semibold">{idea.idea}</h3>
                      <p className="text-sm text-gray-500">
                        Category: {idea.category}
                      </p>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="trends">
                <Button
                  onClick={fetchIndustryTrends}
                  disabled={isLoading}
                  className="mb-4"
                >
                  {isLoading ? "Loading..." : "Fetch Industry Trends"}
                </Button>
                <ScrollArea className="h-[calc(100vh-200px)] w-full border rounded-md p-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  ) : (
                    industryTrends.map((trend, index) => (
                      <div key={index} className="mb-4">
                        <h3 className="font-semibold">{trend.name}</h3>
                        <Progress value={trend.growth} className="w-full" />
                        <p className="text-sm text-gray-500">
                          Growth: {trend.growth}%
                        </p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
