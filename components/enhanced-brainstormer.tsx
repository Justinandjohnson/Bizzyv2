"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Button, Input, ScrollArea, Tabs, Progress } from "./ui";
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
  Move,
  Plus,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import { TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import dynamic from "next/dynamic";
import {
  ForceGraphMethods,
  NodeObject as ForceGraphNodeObject,
  ForceGraphProps,
} from "react-force-graph-2d";
import { debounce } from "lodash";
import * as d3 from "d3-force";
import Draggable from "react-draggable";
import { motion, AnimatePresence } from "framer-motion";
import { createGlobalStyle } from "styled-components";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as d3Force from "d3-force";
import { NodeObject, LinkObject } from "force-graph";
import { mean } from "d3-array";
import { ForceControlPanel } from "./ForceControlPanel";
import {
  analyzeBusinessIdea,
  getFinancialPlan,
  getCompetitorAnalysis, // This import should now work
} from "./business-insights";
import getIndustryTrends from "./industry-trends";
import { MarketAnalysis } from "./market-analysis";
import { CompetitorAnalysis } from "./business-insights";
import { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import * as d3Hierarchy from "d3-hierarchy";
import ForceGraphInstance from "react-force-graph-2d";
// Extend the imported MarketAnalysis interface
interface ExtendedMarketAnalysis extends MarketAnalysis {
  errorMessage?: string;
}

interface ExtendedForceGraphMethods extends ForceGraphMethods<Node, Link> {
  canvas: HTMLCanvasElement;
  // Add any additional methods you need
}

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div>Loading graph...</div>,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
console.log("API_URL:", API_URL);

interface Node extends ForceGraphNodeObject {
  id: string;
  name: string;
  val: number;
  color?: string;
  expanded?: boolean;
  parentId?: string;
  depth?: number;
  clicked?: boolean;
}

interface Link extends LinkObject {
  source: string | Node;
  target: string | Node;
  distance?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const MemoizedForceGraph2D = React.memo(ForceGraph2D);

const calculateEnhancedBrainstormerNodeSize = (label: string) => {
  return Math.max(label.length * 6, 40);
};

const ResizableStyles = createGlobalStyle`
  .react-resizable {
    position: relative;
  }
  .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    background-repeat: no-repeat;
    background-origin: content-box;
    box-sizing: border-box;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCAwIDYgTCAwIDQuMiBMIDQuMiA0LjIgTDQuMiAwIEwgNiAwIEwgNiA2IEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
    background-position: bottom right;
    padding: 0 3px 3px 0;
  }
  .react-resizable-handle-se {
    bottom: 0;
    right: 0;
    cursor: se-resize;
  }
`;

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;

const hexRadius = 80; // Adjust this value to change the size of hexagons
const hexHeight = hexRadius * Math.sqrt(3);

function hexPosition(row: number, col: number) {
  return {
    x: ((hexRadius * 3) / 2) * col,
    y: hexHeight * (row + (col % 2) / 2),
  };
}

const CENTRAL_NODE_SIZE = 30; // Reduced from 40
const SUB_NODE_SIZE = 20; // Reduced from 25
const NEW_NODE_SIZE = 12; // Reduced from 15
const NODE_DISTANCE = 100; // Reduced from 200
const PROGRESS_COLOR = "rgba(0, 255, 0, 0.5)";

const RESIZE_HANDLE_COLOR = "orange";
const RESIZE_HANDLE_SIZE = 6;

type ExpandingNodeProgress = {
  [nodeId: string]: number;
};

function createGroupForce(nodes: Node[], strength: number = 0.1) {
  return (alpha: number) => {
    const groupedNodes = nodes.reduce((acc, node) => {
      const parentId = node.parentId || "root";
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(node);
      return acc as Record<string, Node[]>;
    }, {} as Record<string, Node[]>);

    Object.values(groupedNodes).forEach((group) => {
      const centerX = mean(group, (d) => d.x);
      const centerY = mean(group, (d) => d.y);
      group.forEach((node) => {
        node.vx! += (centerX! - node.x!) * alpha * strength;
        node.vy! += (centerY! - node.y!) * alpha * strength;
      });
    });
  };
}

// Add this function at the top of your file, outside of the component
function getRainbowColor(progress: number): string {
  const hue = (progress / 100) * 360;
  return `hsl(${hue}, 100%, 50%)`;
}

function calculateGroupCenter(nodes: Node[]): { x: number; y: number } {
  const sum = nodes.reduce(
    (acc, node) => ({
      x: acc.x + (node.x || 0),
      y: acc.y + (node.y || 0),
    }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / nodes.length,
    y: sum.y / nodes.length,
  };
}

const getParentChain = (
  nodeId: string,
  graphData: { nodes: Node[] }
): string[] => {
  const chain: string[] = [];
  let currentNode: Node | undefined = graphData.nodes.find(
    (node) => node.id === nodeId
  );
  while (currentNode && currentNode.parentId) {
    const parentNode = graphData.nodes.find(
      (node) => node.id === currentNode?.parentId
    );
    if (parentNode) {
      chain.unshift(parentNode.name);
      currentNode = parentNode;
    } else {
      break;
    }
  }
  return chain;
};

const extractBusinessName = (details: string) => {
  const match = details.match(/Business Name[:\n]\s*(.*)/i);
  return match ? match[1].trim().replace(/\*\*/g, "") : "N/A";
};

const extractPitch = (details: string) => {
  const match = details.match(/One-Sentence pitch[:\n]\s*(.*)/i);
  return match ? match[1].trim().replace(/\*\*/g, "") : "N/A";
};

const extractDescription = (details: string) => {
  const match = details.match(
    /Detailed description[^:]*:([\s\S]*?)(?=\d+\.\s|\Z)/i
  );
  return match ? match[1].trim() : "N/A";
};

const extractTargetMarket = (details: string) => {
  const match = details.match(/Target market:\s*(.*)/);
  return match ? match[1] : "N/A";
};

const extractKeyFeatures = (details: string) => {
  const match = details.match(
    /Key features or services:([\s\S]*?)(?=\d+\.\s|\Z)/i
  );
  return match
    ? match[1]
        .trim()
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f)
    : [];
};

const extractRevenueStreams = (details: string) => {
  const match = details.match(
    /Potential revenue streams:([\s\S]*?)(?=\d+\.\s|\Z)/i
  );
  return match
    ? match[1]
        .trim()
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s)
    : [];
};

const extractInitialSteps = (details: string) => {
  const match = details.match(/Initial steps to launch[^:]*:([\s\S]*?)(?=\Z)/i);
  return match
    ? match[1]
        .trim()
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s)
    : [];
};

export function EnhancedBrainstormer() {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "ai" }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
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
  const [initialIdeaInput, setInitialIdeaInput] = useState("");
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [
      {
        id: "center",
        name: "",
        x: DEFAULT_WIDTH / 2,
        y: DEFAULT_HEIGHT / 2,
        val: CENTRAL_NODE_SIZE,
      },
    ],
    links: [],
  });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [linkDistances, setLinkDistances] = useState<{ [key: string]: number }>(
    {}
  );
  const [draggedLink, setDraggedLink] = useState<Link | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mindMapWidth, setMindMapWidth] = useState(DEFAULT_WIDTH);
  const [mindMapHeight, setMindMapHeight] = useState(DEFAULT_HEIGHT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingLink, setResizingLink] = useState<Link | null>(null);
  const [expandingNodes, setExpandingNodes] = useState<Set<string>>(new Set());
  const [centralNode, setCentralNode] = useState<Node>({
    id: "center",
    name: "",
    x: DEFAULT_WIDTH / 2,
    y: DEFAULT_HEIGHT / 2,
    val: 30,
  });
  const [expandingNodeProgress, setExpandingNodeProgress] = useState<{
    [key: string]: number;
  }>({});
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [marketAnalysis, setMarketAnalysis] =
    useState<ExtendedMarketAnalysis | null>(null);
  const [competitorAnalysis, setCompetitorAnalysis] =
    useState<CompetitorAnalysis | null>(null);
  const [swotAnalysis, setSwotAnalysis] = useState<{
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  }>({ strengths: [], weaknesses: [], opportunities: [], threats: [] });
  const [initialLinkDistance, setInitialLinkDistance] = useState<number | null>(
    null
  );
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastGeneratedNodeId, setLastGeneratedNodeId] = useState<string | null>(
    null
  );
  const [clickedNodes, setClickedNodes] = useState<Node[]>([]);
  const [generatedIdea, setGeneratedIdea] = useState<string | null>(null);
  const [generatedPitch, setGeneratedPitch] = useState<string | null>(null);
  const [fullBusinessDetails, setFullBusinessDetails] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [linkStrength, setLinkStrength] = useState(1);
  const [chargeStrength, setChargeStrength] = useState(-500);
  const [collideStrength, setCollideStrength] = useState(0.7);
  const [centerStrength, setCenterStrength] = useState(0.1);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedGenerationTime, setEstimatedGenerationTime] = useState(30);
  const [showPitchOverlay, setShowPitchOverlay] = useState(false);
  const [isPitchPanelCollapsed, setIsPitchPanelCollapsed] = useState(false);

  const graphRef = useRef<ExtendedForceGraphMethods | null>(null);
  const workerRef = useRef<Worker | null>(null);

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
      graphRef.current
        .d3Force(
          "link",
          d3
            .forceLink()
            .id((d: any) => d.id)
            .distance((link: any) => link.distance || NODE_DISTANCE * 1.2)
            .strength(linkStrength)
        )
        .d3Force("charge", d3.forceManyBody().strength(chargeStrength))
        .d3Force(
          "collide",
          d3.forceCollide(NODE_DISTANCE / 2).strength(collideStrength)
        )
        .d3Force(
          "center",
          d3
            .forceCenter(mindMapWidth / 2, mindMapHeight / 2)
            .strength(centerStrength)
        );
      graphRef.current.d3ReheatSimulation();
    }
  }, [
    linkStrength,
    chargeStrength,
    collideStrength,
    centerStrength,
    mindMapWidth,
    mindMapHeight,
  ]);

  useEffect(() => {
    setMindMapWidth(window.innerWidth);
    setMindMapHeight(window.innerHeight);

    const handleResize = () => {
      setMindMapWidth(window.innerWidth);
      setMindMapHeight(window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("link")?.distance((link: any) => {
        const key = `${link.source.id}-${link.target.id}`;
        return linkDistances[key] ?? 50;
      });
      graphRef.current.d3ReheatSimulation();
    }
  }, [linkDistances]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [graphData.nodes.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdeaProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prevProgress + 10;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const graphElement = graphRef.current as HTMLElement | null;
      if (graphElement) {
        const rect = graphElement.getBoundingClientRect();
        setMousePos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    };

    if (graphRef.current) {
      // Use type assertion to access the canvas
      const graphDom = graphRef.current.canvas;
      if (graphDom instanceof HTMLCanvasElement) {
        graphDom.addEventListener("mousemove", handleMouseMove);
      }
    }

    return () => {
      if (graphRef.current) {
        // Use the same type assertion in the cleanup function
        const graphDom = graphRef.current.canvas;
        if (graphDom instanceof HTMLCanvasElement) {
          graphDom.removeEventListener("mousemove", handleMouseMove);
        }
      }
    };
  }, [graphRef, setHoveredNode]);

  async function analyzeBusinessIdea(idea: string): Promise<string> {
    // Implement your analysis logic here
    // For example:
    return `Market analysis for "${idea}": [Your analysis result here]`;
  }

  const fetchMarketAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/market-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessIdea: currentIdea }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMarketAnalysis(data.analysis);
    } catch (error) {
      console.error("Error fetching market analysis:", error);
      setMarketAnalysis({
        summary: "",
        keyProducts: [],
        marketTrends: [],
        potentialCompetitors: [],
        successPrediction: "",
        errorMessage: "Failed to fetch market analysis. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompetitorAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/competitor-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessIdea: currentIdea }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const analysis = await response.json();
      setCompetitorAnalysis(analysis);
    } catch (error) {
      console.error("Error fetching competitor analysis:", error);
      setCompetitorAnalysis({
        directCompetitors: ["Failed to fetch"],
        indirectCompetitors: ["Failed to fetch"],
        marketShare: { "Failed to fetch": 100 },
        swotAnalysis: {
          strengths: ["Failed to fetch"],
          weaknesses: ["Failed to fetch"],
          opportunities: ["Failed to fetch"],
          threats: ["Failed to fetch"],
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSwotAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/swot-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: currentIdea }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const analysis = await response.json();
      setSwotAnalysis(analysis);
    } catch (error) {
      console.error("Error fetching SWOT analysis:", error);
      setSwotAnalysis({
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndustryTrends = async () => {
    setIsLoading(true);
    try {
      const trends = await getIndustryTrends(currentIdea);
      setIndustryTrends(trends);
    } catch (error) {
      console.error("Error fetching industry trends:", error);
      setIndustryTrends([]);
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
    if (!initialIdeaInput.trim()) return;

    setIsLoading(true);
    const centerX = mindMapWidth / 2;
    const centerY = mindMapHeight / 2;

    try {
      const response = await fetch(`${API_URL}/api/expand-node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: "center",
          nodeName: initialIdeaInput,
          initialIdea: initialIdeaInput,
          depth: 1,
          parentChain: [],
          selectedNodes: [],
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      const centralNode = {
        id: "center",
        name: initialIdeaInput,
        x: centerX,
        y: centerY,
        val: CENTRAL_NODE_SIZE,
      };

      const subNodes = data.nodes
        .filter(
          (node: Node) =>
            node.name &&
            node.name.trim() !== "" &&
            node.name.toLowerCase() !== initialIdeaInput.toLowerCase()
        )
        .slice(0, 3)
        .map((node: Node, index: number) => {
          const angle = (2 * Math.PI * index) / 3;
          return {
            ...node,
            id: `node_${index}`,
            x: centerX + NODE_DISTANCE * Math.cos(angle),
            y: centerY + NODE_DISTANCE * Math.sin(angle),
            val: SUB_NODE_SIZE,
          };
        });

      const links = subNodes.map((node: Node) => ({
        source: centralNode,
        target: node,
      }));

      setGraphData({
        nodes: [centralNode, ...subNodes],
        links: links,
      });
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
    setExpandingNodes((prev) => new Set(prev).add(node.id));
    setExpandingNodeProgress((prev) => ({ ...prev, [node.id]: 0 }));
    setActiveNode(node.id);

    try {
      // Start progress animation
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        setExpandingNodeProgress((prev) => ({
          ...prev,
          [node.id]: Math.min(progress, 90),
        }));
      }, 50);

      const response = await fetch(`${API_URL}/api/expand-node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: node.id,
          nodeName: node.name,
          initialIdea: initialIdeaInput,
          depth: node.depth || 1,
          parentChain: getParentChain(node.id, graphData), // Pass graphData here
          selectedNodes: clickedNodes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${JSON.stringify(
            errorData
          )}`
        );
      }

      const newData = await response.json();
      console.log("Received data from server:", newData);

      // Stop progress animation
      clearInterval(progressInterval);
      setExpandingNodeProgress((prev) => ({ ...prev, [node.id]: 100 }));

      if (newData.nodes && Array.isArray(newData.nodes)) {
        const existingChildNodes = graphData.nodes.filter(
          (n) => n.parentId === node.id
        );
        const baseAngle =
          existingChildNodes.length > 0
            ? Math.atan2(
                existingChildNodes[0].y! - node.y!,
                existingChildNodes[0].x! - node.x!
              ) + Math.PI
            : Math.random() * 2 * Math.PI;

        const rotationAngle =
          ((2 * Math.PI) / 3) * (existingChildNodes.length / 3);
        const startAngle = baseAngle + rotationAngle;

        const subNodes = newData.nodes
          .slice(0, 3)
          .map((newNode: Node, index: number) => {
            const angle = startAngle + index * (Math.PI / 6);
            const distance = NODE_DISTANCE * 1.2; // Increased distance
            const x = node.x! + distance * Math.cos(angle);
            const y = node.y! + distance * Math.sin(angle);
            return {
              ...newNode,
              id: `${node.id}_${existingChildNodes.length + index}`,
              x: x,
              y: y,
              val: NEW_NODE_SIZE,
              parentId: node.id,
              depth: (node.depth || 0) + 1,
            };
          });

        setGraphData((prevData) => {
          const newNodes = [...prevData.nodes, ...subNodes];
          const newLinks = [
            ...prevData.links,
            ...subNodes.map((subNode: Node) => ({
              // Add the Node type here
              source: node.id,
              target: subNode.id,
              distance: NODE_DISTANCE * 1.2,
            })),
          ];

          if (subNodes.length > 0) {
            setLastGeneratedNodeId(subNodes[subNodes.length - 1].id);
          } else {
            setLastGeneratedNodeId(null);
          }

          return { nodes: newNodes, links: newLinks };
        });

        // Update forces
        if (graphRef.current) {
          graphRef.current
            .d3Force(
              "link",
              d3
                .forceLink(graphData.links)
                .id((d: any) => d.id)
                .distance((link: any) => link.distance || NODE_DISTANCE * 1.2)
                .strength(0.5) // Reduce from 1 to 0.5
            )
            .d3Force("charge", d3.forceManyBody().strength(-300)) // Reduce from -500 to -300
            .d3Force(
              "collide",
              d3.forceCollide(NODE_DISTANCE / 2).strength(0.9) // Increase from 0.7 to 0.9
            )
            .d3Force(
              "center",
              d3.forceCenter(mindMapWidth / 2, mindMapHeight / 2)
            );
          graphRef.current.d3ReheatSimulation();
        }
      }
    } catch (error: any) {
      console.error("Error expanding node:", error);
      setMessages((prev) => [
        ...prev,
        { text: `Error expanding node: ${error.message}`, sender: "ai" },
      ]);
    } finally {
      // Delay the removal of the progress indicator
      setTimeout(() => {
        setExpandingNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(node.id);
          return newSet;
        });
        setExpandingNodeProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[node.id];
          return newProgress;
        });
        setActiveNode(null);
      }, 1000);
    }
  };

  const handleFinalizeIdea = async () => {
    setShowPitchOverlay(true);
    setIsPitchPanelCollapsed(false);
    setIsLoading(true);
    try {
      await generateBusinessIdea();
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
    const value = e.target.value;
    setInitialIdeaInput(value);
    debouncedHandleInitialIdeaChange(value);
  };

  const handleCurrentIdeaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIdea(e.target.value);
  };

  const handleInitialIdeaKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && initialIdeaInput.trim() && !isLoading) {
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

  const handleZoomToFit = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 20);
    }
  }, []);

  const handleCenterOnLastNode = useCallback(() => {
    if (graphRef.current && lastGeneratedNodeId) {
      const node = graphData.nodes.find((n) => n.id === lastGeneratedNodeId);
      if (node) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(1.5, 1000);
      }
    }
  }, [graphData.nodes, lastGeneratedNodeId]);

  const memoizedGraphData = useMemo(() => graphData, [graphData]);

  const handleAddNode = useCallback(
    (parentNode: Node) => {
      const newNodeId = `${parentNode.id}_${graphData.nodes.length}`;
      const newNode: Node = {
        id: newNodeId,
        name: "New Idea",
        val: 15,
        parentId: parentNode.id,
        depth: (parentNode.depth || 0) + 1,
        fx: undefined,
        fy: undefined,
      };
      const newLink: Link = {
        source: parentNode,
        target: newNode,
      };
      setGraphData((prevData) => ({
        nodes: [...prevData.nodes, newNode],
        links: [...prevData.links, newLink],
      }));
    },
    [graphData]
  );

  const handleNodeClick = useCallback(
    (node: ForceGraphNodeObject, event: MouseEvent) => {
      const nodeObj = node as Node;
      const nodeSize = calculateEnhancedBrainstormerNodeSize(nodeObj.name);
      const radius = nodeSize / 2;
      const dx = event.offsetX - nodeObj.x!;
      const dy = event.offsetY - nodeObj.y!;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

      if (distanceFromCenter > radius && distanceFromCenter <= radius + 16) {
        handleAddNode(nodeObj);
      } else {
        // Fix the node's position
        nodeObj.fx = nodeObj.x;
        nodeObj.fy = nodeObj.y;

        expandNode(nodeObj);
        // Mark the node as clicked and add to clickedNodes
        setGraphData((prevData) => ({
          ...prevData,
          nodes: prevData.nodes.map((n) =>
            n.id === nodeObj.id ? { ...n, clicked: true, fx: n.x, fy: n.y } : n
          ),
        }));
        setClickedNodes((prev) => {
          const nodeExists = prev.some((n) => n.id === nodeObj.id);
          if (!nodeExists) {
            return [...prev, nodeObj];
          }
          return prev;
        });
      }
    },
    [expandNode, handleAddNode]
  );

  const handleNodeRightClick = useCallback(
    (node: SimulationNodeDatum, event: MouseEvent) => {
      event.preventDefault();
      expandNode(node as Node);
    },
    [expandNode]
  );

  const handleLinkClick = useCallback(
    (link: Link, event: MouseEvent) => {
      const source =
        typeof link.source === "object"
          ? link.source
          : graphData.nodes.find((n) => n.id === link.source);
      const target =
        typeof link.target === "object"
          ? link.target
          : graphData.nodes.find((n) => n.id === link.target);

      if (source && target && mousePos) {
        const midX = (source.x! + target.x!) / 2;
        const midY = (source.y! + target.y!) / 2;
        const dist = Math.hypot(mousePos.x - midX, mousePos.y - midY);
        if (dist <= RESIZE_HANDLE_SIZE / graphRef.current!.zoom()) {
          handleResizeStart(link, event);
        }
      }
    },
    [graphData.nodes, mousePos]
  );

  const particlesCfg = useMemo(() => {
    return {
      frames: 100,
      lines: graphData.links.map(() => Math.round(Math.random() * 10 + 1)),
    };
  }, [graphData]);

  const handleNodeDrag = (
    node: ForceGraphNodeObject,
    translate: { x: number; y: number }
  ) => {
    const typedNode = node as Node;
    const newX = (typedNode.x || 0) + translate.x;
    const newY = (typedNode.y || 0) + translate.y;

    setGraphData((prevData) => {
      const updatedNodes = prevData.nodes.map((n) => {
        if (n.id === typedNode.id) {
          return { ...n, x: newX, y: newY, fx: newX, fy: newY };
        }
        if (n.parentId === typedNode.id) {
          const dx = newX - (typedNode.x || 0);
          const dy = newY - (typedNode.y || 0);
          return {
            ...n,
            x: (n.x || 0) + dx,
            y: (n.y || 0) + dy,
            fx: (n.x || 0) + dx,
            fy: (n.y || 0) + dy,
          };
        }
        return n;
      });

      return { ...prevData, nodes: updatedNodes };
    });
  };

  const handleNodeDragEnd = (node: ForceGraphNodeObject) => {
    const draggedNode = node as Node;
    setGraphData((prevData) => {
      const updatedNodes = prevData.nodes.map((n) => {
        if (n.id === draggedNode.id || n.parentId === draggedNode.id) {
          return {
            ...n,
            fx: undefined,
            fy: undefined,
          };
        }
        return n;
      });

      return { ...prevData, nodes: updatedNodes };
    });

    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  };

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodes(new Set());
  }, []);

  const handleNodeHover = useCallback((node: ForceGraphNodeObject | null) => {
    setHoveredNode(node as Node | null);
  }, []);

  const handleResizeStart = useCallback(
    (link: Link, event: MouseEvent) => {
      event.stopPropagation();
      setIsResizing(true);
      setResizingLink(link);
      const source =
        typeof link.source === "object"
          ? link.source
          : graphData.nodes.find((n) => n.id === link.source);
      const target =
        typeof link.target === "object"
          ? link.target
          : graphData.nodes.find((n) => n.id === link.target);
      if (source && target) {
        const initialDistance = Math.hypot(
          target.x! - source.x!,
          target.y! - source.y!
        );
        setInitialLinkDistance(initialDistance);
      }
    },
    [graphData.nodes]
  );

  const handleResizeMove = useCallback(
    (event: MouseEvent) => {
      if (isResizing && resizingLink && initialLinkDistance !== null) {
        const source = resizingLink.source as Node;
        const target = resizingLink.target as Node;
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const currentDistance = Math.hypot(dx, dy);
        const scaleFactor = 1 + event.movementX / 100;
        const newDistance = Math.max(
          30,
          Math.min(300, currentDistance * scaleFactor)
        );

        setLinkDistances((prev) => ({
          ...prev,
          [`${source.id}-${target.id}`]: newDistance,
        }));

        if (graphRef.current) {
          graphRef.current.d3Force("link")?.distance((l: any) => {
            const key = `${l.source.id}-${l.target.id}`;
            return linkDistances[key] ?? NODE_DISTANCE;
          });
          graphRef.current.d3ReheatSimulation();
        }
      }
    },
    [isResizing, resizingLink, initialLinkDistance, linkDistances]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizingLink(null);
    setInitialLinkDistance(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, []);

  const handleDrawLine = (
    startPos: { x: number; y: number },
    endPos: { x: number; y: number }
  ) => {
    // Calculate the direction vector
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // ... rest of the function
  };

  const handleZoom = useCallback((zoom: { k: number }) => {
    if (graphRef.current) {
      graphRef.current.d3Force("charge")?.strength?.(-300 * zoom.k);
      graphRef.current.d3Force("link")?.distance?.(NODE_DISTANCE * zoom.k);
      graphRef.current.d3ReheatSimulation?.();
    }
  }, []);

  const handleReorganizeTree = useCallback(() => {
    if (graphData.nodes.length === 0) return;

    const rootId = graphData.nodes[0].id;
    const hierarchyData = d3Hierarchy
      .stratify()
      .id((d: any) => d.id)
      .parentId((d: any) => d.parentId || (d.id === rootId ? null : rootId))(
      graphData.nodes
    );

    const treeLayout = d3Hierarchy
      .tree<Node>()
      .size([mindMapHeight * 0.9, mindMapWidth * 0.9]);
    const root = treeLayout(hierarchyData as any);

    const newNodes = root.descendants().map((d) => ({
      ...d.data,
      x: d.y + mindMapWidth * 0.05, // Swap x and y to make the tree horizontal
      y: d.x + mindMapHeight * 0.05,
      fx: d.y + mindMapWidth * 0.05,
      fy: d.x + mindMapHeight * 0.05,
    }));

    setGraphData((prevData) => ({
      nodes: newNodes,
      links: prevData.links,
    }));

    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
      setTimeout(() => {
        handleZoomToFit();
      }, 500);
    }
  }, [graphData, mindMapWidth, mindMapHeight, handleZoomToFit]);

  const DEBUG_MODE = true; // Set this to true temporarily

  const logError = (message: string, error: any) => {
    console.error(`${message}:`, error);
    // You could also send this error to a logging service here
  };

  const generateBusinessIdea = async () => {
    console.log("generateBusinessIdea function called");
    setIsLoading(true);
    setGenerationProgress(0);
    setShowPitchOverlay(true);

    try {
      // Estimate generation time
      const estimateResponse = await fetch(
        `${API_URL}/api/estimate-generation-time`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: clickedNodes.map((node) => node.name),
          }),
        }
      );
      const estimateData = await estimateResponse.json();
      const estimatedTime = estimateData.estimatedTime;
      setEstimatedGenerationTime(estimatedTime);

      console.log("Estimated generation time:", estimatedTime);

      // Start progress updates
      const intervalId = setInterval(() => {
        setGenerationProgress((prev) =>
          Math.min(prev + 100 / estimatedTime, 99)
        );
      }, 1000);

      const response = await fetch(`${API_URL}/api/generate-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: clickedNodes.map((node) => node.name) }),
      });
      const data = await response.json();

      console.log("Raw API response:", data);

      if (data.fullDetails) {
        const businessName = extractBusinessName(data.fullDetails);
        const pitch = extractPitch(data.fullDetails);
        const fullPitch = `${businessName}: ${pitch}`;

        console.log("Generated Business Idea:", {
          businessName,
          pitch,
          fullPitch,
          fullDetails: data.fullDetails,
        });

        setGeneratedPitch(fullPitch);
        setFullBusinessDetails(data.fullDetails);
        setGeneratedIdea(fullPitch);
        setCurrentIdea(fullPitch);
      } else {
        setGeneratedPitch("Error: Unable to generate business idea");
        console.error("Unexpected data format from API");
      }
    } catch (error: unknown) {
      console.error("Error generating business idea:", error);
      if (error instanceof Error) {
        setGeneratedPitch(`Error: ${error.message}`);
      } else {
        setGeneratedPitch("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
      setGenerationProgress(100); // Ensure progress is set to 100% when complete
    }
  };

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [linkStrength, chargeStrength, collideStrength, centerStrength]);

  interface PitchPresentationProps {
    pitch: string | null;
    progress: number;
    estimatedTime: number;
  }

  const PitchPresentation: React.FC<PitchPresentationProps> = ({
    pitch,
    progress,
    estimatedTime,
  }) => {
    console.log("PitchPresentation received pitch:", pitch);

    const [dots, setDots] = useState("");
    useEffect(() => {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }, []);

    // Split the pitch into business name and pitch text
    const [businessName, businessPitch] =
      pitch && !pitch.startsWith("Error")
        ? pitch.split(":").map((part) => part.trim().replace(/^\*\*/, ""))
        : ["", ""];

    const remainingTime = Math.ceil(estimatedTime * (1 - progress / 100));

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg text-white max-w-2xl mx-auto"
      >
        <h3 className="text-2xl font-bold mb-4">
          Your Brilliant Business Idea
        </h3>
        {progress < 100 && !pitch ? (
          <div>
            <p className="text-lg mb-2">
              Crafting your groundbreaking idea{dots}
            </p>
            <p className="text-sm mb-4">
              Estimated time remaining: {remainingTime} seconds
            </p>
            <div className="relative pt-1">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                />
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            {businessName && businessPitch ? (
              <>
                <p className="text-xl font-semibold mb-2">{businessName}</p>
                <p className="text-lg mb-4">{businessPitch}</p>
              </>
            ) : (
              <p className="text-xl font-semibold mb-4">
                {pitch || "Error: No pitch available"}
              </p>
            )}
            <p className="text-sm">
              {businessName && businessPitch ? (
                <span
                  className="cursor-pointer text-blue-300 hover:underline"
                  onClick={() => {
                    const trendsTab = document.querySelector(
                      '[data-value="trends"]'
                    );
                    if (trendsTab instanceof HTMLElement) {
                      trendsTab.click();
                    }
                  }}
                >
                  Your idea is ready! Explore it in detail in the full business
                  plan.
                </span>
              ) : (
                "Unable to generate a pitch. Please try again."
              )}
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <ResizableStyles />
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Content */}
        <div className="relative z-10 min-h-screen w-full bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center p-4">
          <div className="container mx-auto max-w-full h-full flex flex-col">
            <Card className="flex-grow shadow-lg bg-white bg-opacity-90 backdrop-blur-sm overflow-hidden">
              <h1 className="text-3xl font-bold mb-6 text-[#2D3748] flex items-center">
                Enhanced AI Business Idea Brainstormer
                {isAIReady && <Bot className="ml-2 text-green-500" size={24} />}
              </h1>
              <div className="flex">
                <div className="flex-grow">
                  <Tabs defaultValue="chat" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="chat">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="mindmap">
                        <Network className="w-4 h-4 mr-2" />
                        Mindmap
                      </TabsTrigger>
                      <TabsTrigger value="trends">
                        <Search className="w-4 h-4 mr-2" />
                        Industry Trends
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="chat">
                      <div className="flex flex-col space-y-4">
                        <ScrollArea className="h-[400px] w-full">
                          {messages.map((message, index) => (
                            <div
                              key={index}
                              className={`p-2 ${
                                message.sender === "user"
                                  ? "bg-blue-100"
                                  : "bg-green-100"
                              }`}
                            >
                              {message.text}
                            </div>
                          ))}
                        </ScrollArea>
                        <div className="flex space-x-2">
                          <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type your message..."
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleSendMessage()
                            }
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!isAIReady || isLoading}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="mindmap">
                      <div className="flex flex-col space-y-4">
                        <Input
                          value={initialIdeaInput}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setInitialIdeaInput(newValue);
                            setCentralNode((prev) => ({
                              ...prev,
                              name: newValue,
                            }));
                            setGraphData((prev) => ({
                              ...prev,
                              nodes: prev.nodes.map((node) =>
                                node.id === "center"
                                  ? { ...node, name: newValue }
                                  : node
                              ),
                            }));
                          }}
                          onKeyPress={handleInitialIdeaKeyPress}
                          placeholder="Enter your initial idea..."
                        />
                        <Button
                          onClick={handleGenerateMindMap}
                          disabled={isLoading}
                        >
                          Generate Mind Map
                        </Button>
                        <Button
                          onClick={handleFinalizeIdea}
                          disabled={clickedNodes.length === 0 || isLoading}
                        >
                          Generate Final Business Idea
                        </Button>
                        <div
                          className="relative"
                          style={{ width: mindMapWidth, height: mindMapHeight }}
                        >
                          <ForceGraph2D
                            ref={
                              graphRef as React.MutableRefObject<
                                ForceGraphMethods<Node, Link> | undefined
                              >
                            }
                            graphData={
                              graphData as unknown as {
                                nodes: NodeObject[];
                                links: LinkObject[];
                              }
                            }
                            nodeLabel="name"
                            nodeAutoColorBy="group"
                            nodeVal={(node) => (node as Node).val}
                            linkCanvasObject={(link, ctx, globalScale) => {
                              const start = link.source as Node;
                              const end = link.target as Node;

                              // Calculate the direction vector
                              const dx = end.x! - start.x!;
                              const dy = end.y! - start.y!;
                              const distance = Math.sqrt(dx * dx + dy * dy);

                              // Normalize the direction vector
                              const unitDx = dx / distance;
                              const unitDy = dy / distance;

                              // Calculate start and end points on the node boundaries
                              const startNodeSize = start.val / globalScale;
                              const endNodeSize = end.val / globalScale;
                              const startX = start.x! + unitDx * startNodeSize;
                              const startY = start.y! + unitDy * startNodeSize;
                              const endX = end.x! - unitDx * endNodeSize;
                              const endY = end.y! - unitDy * endNodeSize;

                              // Draw line
                              ctx.beginPath();
                              ctx.moveTo(startX, startY);
                              ctx.lineTo(endX, endY);
                              ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
                              ctx.lineWidth = 1.5 / globalScale;
                              ctx.stroke();

                              // Draw resize handle
                              const midX = (startX + endX) / 2;
                              const midY = (startY + endY) / 2;
                              const handleSize =
                                RESIZE_HANDLE_SIZE / globalScale;

                              ctx.beginPath();
                              ctx.arc(midX, midY, handleSize, 0, 2 * Math.PI);
                              ctx.fillStyle = RESIZE_HANDLE_COLOR;
                              ctx.fill();

                              // Check if mouse is over the resize handle
                              if (mousePos && graphRef.current) {
                                const graphCoords =
                                  graphRef.current.screen2GraphCoords(
                                    mousePos.x,
                                    mousePos.y
                                  );
                                const distToHandle = Math.hypot(
                                  graphCoords.x - midX,
                                  graphCoords.y - midY
                                );
                                if (distToHandle <= handleSize) {
                                  ctx.fillStyle = "rgba(255, 165, 0, 0.8)"; // Highlight color
                                  ctx.fill();
                                  if (graphRef.current.canvas) {
                                    graphRef.current.canvas.style.cursor =
                                      "pointer";
                                  }
                                } else {
                                  if (graphRef.current.canvas) {
                                    graphRef.current.canvas.style.cursor =
                                      "default";
                                  }
                                }
                              }
                            }}
                            nodeCanvasObject={(node, ctx, globalScale) => {
                              const typedNode = node as Node;
                              const label = typedNode.name;
                              if (!label || label.trim() === "") return;

                              const fontSize = 12 / globalScale;
                              ctx.font = `${fontSize}px Sans-Serif`;
                              const textWidth = ctx.measureText(label).width;
                              const padding = 2 / globalScale;
                              const nodeSize = Math.max(
                                (typedNode.val ?? 1) / globalScale,
                                (textWidth + padding * 2) / 2
                              );

                              // Draw node
                              ctx.beginPath();
                              ctx.arc(
                                typedNode.x ?? 0,
                                typedNode.y ?? 0,
                                nodeSize,
                                0,
                                2 * Math.PI
                              );
                              ctx.fillStyle = typedNode.clicked
                                ? "rgba(0, 0, 255, 0.8)"
                                : "rgba(255, 255, 255, 0.8)";
                              ctx.fill();

                              ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
                              ctx.stroke();

                              // Draw text
                              ctx.textAlign = "center";
                              ctx.textBaseline = "middle";
                              ctx.fillStyle = typedNode.clicked
                                ? "white"
                                : "blue";
                              ctx.fillText(
                                label,
                                typedNode.x ?? 0,
                                typedNode.y ?? 0
                              );

                              // Draw progress indicator if node is expanding
                              if (
                                expandingNodeProgress[typedNode.id] !==
                                undefined
                              ) {
                                const progress =
                                  expandingNodeProgress[typedNode.id];
                                const radius = nodeSize + 4 / globalScale;
                                const startAngle = -Math.PI / 2;
                                const endAngle =
                                  startAngle + (Math.PI * 2 * progress) / 100;

                                ctx.beginPath();
                                ctx.arc(
                                  typedNode.x!,
                                  typedNode.y!,
                                  radius,
                                  startAngle,
                                  endAngle
                                );
                                ctx.lineWidth = 4 / globalScale;
                                ctx.strokeStyle = getRainbowColor(progress);
                                ctx.stroke();

                                // Add glow effect
                                ctx.shadowColor = getRainbowColor(progress);
                                ctx.shadowBlur = 10 / globalScale;
                                ctx.stroke();
                                ctx.shadowBlur = 0;
                              }
                            }}
                            linkDirectionalParticles={2}
                            linkDirectionalParticleSpeed={0.005}
                            linkDirectionalParticleWidth={1}
                            linkDirectionalParticleColor={() =>
                              "rgba(0, 0, 0, 0.2)"
                            }
                            onNodeClick={(
                              node: ForceGraphNodeObject,
                              event: MouseEvent
                            ) =>
                              handleNodeClick(
                                node as ForceGraphNodeObject,
                                event
                              )
                            }
                            onNodeRightClick={(node, event: MouseEvent) =>
                              handleNodeRightClick(
                                node as SimulationNodeDatum,
                                event
                              )
                            }
                            onLinkClick={(link, event) => {
                              handleLinkClick(link as Link, event);
                            }}
                            onNodeDrag={handleNodeDrag}
                            onNodeDragEnd={handleNodeDragEnd}
                            onBackgroundClick={handleBackgroundClick}
                            d3Force={{
                              link: d3
                                .forceLink<Node, Link>()
                                .id((d) => d.id)
                                .distance(
                                  (link) => link.distance || NODE_DISTANCE * 1.2
                                )
                                .strength(linkStrength),
                              charge: d3
                                .forceManyBody<Node>()
                                .strength(chargeStrength),
                              collide: d3
                                .forceCollide<Node>(NODE_DISTANCE / 2)
                                .strength(collideStrength),
                              center: d3
                                .forceCenter(
                                  mindMapWidth / 2,
                                  mindMapHeight / 2
                                )
                                .strength(centerStrength),
                            }}
                            cooldownTicks={100}
                            enableNodeDrag={true}
                            enableZoomPanInteraction={true}
                            onNodeHover={(node) => {
                              setHoveredNode(node as Node | null);
                            }}
                            onBackgroundRightClick={(event) => {
                              // Handle right-click on background if needed
                            }}
                            expandingNodes={expandingNodes}
                            d3AlphaDecay={0.02}
                            d3VelocityDecay={0.3}
                            linkWidth={2}
                            linkColor={() => "rgba(0, 0, 0, 0.2)"}
                            width={mindMapWidth}
                            height={mindMapHeight}
                            onEngineStop={() => {
                              if (graphRef.current) {
                                graphRef.current.zoomToFit(400, 100);
                                graphRef.current.d3ReheatSimulation();
                              }
                            }}
                          />
                          <div className="absolute top-2 right-2 flex flex-col items-end space-y-2">
                            <div className="flex space-x-2">
                              <Button onClick={handleZoomIn}>
                                <ZoomIn size={16} />
                              </Button>
                              <Button onClick={handleZoomOut}>
                                <ZoomOut size={16} />
                              </Button>
                              <Button onClick={handleZoomToFit}>
                                <Move size={16} />
                              </Button>
                              <Button onClick={handleCenterOnLastNode}>
                                <ChevronRight size={16} />
                              </Button>
                              <Button onClick={handleReorganizeTree}>
                                <ArrowLeftRight size={16} />
                              </Button>
                              <Button
                                onClick={handleFinalizeIdea}
                                disabled={
                                  clickedNodes.length === 0 || isLoading
                                }
                              >
                                Generate Business Idea
                              </Button>
                              <Button
                                onClick={() => setShowPitchOverlay(true)}
                                disabled={!generatedPitch}
                                className="ml-2"
                              >
                                Show Pitch
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent
                      value="trends"
                      className="h-full overflow-y-auto"
                    >
                      <div className="flex h-full">
                        {/* Left Section: Full Business Idea */}
                        <div className="w-1/2 p-4 bg-gray-100 overflow-y-auto max-h-[calc(100vh-200px)]">
                          <h2 className="text-2xl font-bold mb-4">
                            📝 Full Business Idea
                          </h2>
                          {fullBusinessDetails && (
                            <div className="space-y-6">
                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  🏢 Business Name
                                </h3>
                                <p className="mt-2">
                                  {extractBusinessName(fullBusinessDetails)}
                                </p>
                              </section>

                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  🎯 One-Sentence Pitch
                                </h3>
                                <p className="mt-2">
                                  {extractPitch(fullBusinessDetails)}
                                </p>
                              </section>

                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  📊 Detailed Description
                                </h3>
                                <p className="mt-2">
                                  {extractDescription(fullBusinessDetails)}
                                </p>
                              </section>

                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  👥 Target Market
                                </h3>
                                <p className="mt-2">
                                  {extractTargetMarket(fullBusinessDetails)}
                                </p>
                              </section>

                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  🔑 Key Features/Services
                                </h3>
                                <ul className="list-disc list-inside mt-2">
                                  {extractKeyFeatures(fullBusinessDetails).map(
                                    (feature, index) => (
                                      <li key={index} className="ml-4">
                                        {feature}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </section>

                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  💰 Revenue Streams
                                </h3>
                                <ul className="list-disc list-inside mt-2">
                                  {extractRevenueStreams(
                                    fullBusinessDetails
                                  ).map((stream, index) => (
                                    <li key={index} className="ml-4">
                                      {stream}
                                    </li>
                                  ))}
                                </ul>
                              </section>

                              <section>
                                <h3 className="text-xl font-semibold text-blue-600">
                                  🚀 Initial Steps
                                </h3>
                                <ol className="list-decimal list-inside mt-2">
                                  {extractInitialSteps(fullBusinessDetails).map(
                                    (step, index) => (
                                      <li key={index} className="ml-4">
                                        {step}
                                      </li>
                                    )
                                  )}
                                </ol>
                              </section>
                            </div>
                          )}
                        </div>

                        {/* Right Section: Business Insights */}
                        <div className="w-1/2 p-4 overflow-y-auto">
                          <h2 className="text-2xl font-bold mb-4">
                            💡 Business Insights
                          </h2>

                          {/* Add buttons for each business insight function */}
                          <div className="mb-4 space-x-2">
                            <Button
                              onClick={() => fetchMarketAnalysis()}
                              className="bg-neon-green text-black hover:bg-neon-green-dark transition-colors duration-300"
                            >
                              Market Analysis
                            </Button>
                            <Button onClick={() => fetchCompetitorAnalysis()}>
                              Competitor Analysis
                            </Button>
                            <Button onClick={() => fetchSwotAnalysis()}>
                              SWOT Analysis
                            </Button>
                            <Button onClick={() => fetchIndustryTrends()}>
                              Industry Trends
                            </Button>
                          </div>

                          {/* Market Analysis */}
                          <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-2 text-blue-600">
                              📊 Market Analysis
                            </h3>
                            {marketAnalysis ? (
                              marketAnalysis.errorMessage ? (
                                <p className="text-sm text-red-500 italic">
                                  {marketAnalysis.errorMessage}
                                </p>
                              ) : (
                                <div className="bg-gray-100 rounded-lg p-4 shadow-md space-y-4">
                                  <p className="text-sm text-gray-600">
                                    {marketAnalysis.summary}
                                  </p>

                                  <div>
                                    <h4 className="font-semibold text-blue-500">
                                      Key Products/Services:
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-gray-600">
                                      {marketAnalysis.keyProducts.map(
                                        (product, index) => (
                                          <li key={index}>{product}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold text-blue-500">
                                      Market Trends:
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-gray-600">
                                      {marketAnalysis.marketTrends.map(
                                        (trend, index) => (
                                          <li key={index}>{trend}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold text-blue-500">
                                      Potential Competitors:
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-gray-600">
                                      {marketAnalysis.potentialCompetitors.map(
                                        (competitor, index) => (
                                          <li key={index}>{competitor}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold text-blue-500">
                                      Success Prediction:
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {marketAnalysis.successPrediction}
                                    </p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <p className="text-sm text-gray-500 italic">
                                No market analysis available
                              </p>
                            )}
                          </div>

                          {/* Competitor Analysis */}
                          <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-2">
                              🏆 Competitor Analysis
                            </h3>
                            {competitorAnalysis ? (
                              <>
                                <h4>Direct Competitors:</h4>
                                <ul>
                                  {competitorAnalysis.directCompetitors.map(
                                    (competitor: string, index: number) => (
                                      <li key={index}>{competitor}</li>
                                    )
                                  )}
                                </ul>
                                <h4>Indirect Competitors:</h4>
                                <ul>
                                  {competitorAnalysis.indirectCompetitors.map(
                                    (competitor: string, index: number) => (
                                      <li key={index}>{competitor}</li>
                                    )
                                  )}
                                </ul>
                                <h4>Market Share:</h4>
                                <ul>
                                  {Object.entries(
                                    competitorAnalysis.marketShare
                                  ).map(([company, share], index) => (
                                    <li key={index}>
                                      {company}:{" "}
                                      {typeof share === "number"
                                        ? `${share}%`
                                        : "N/A"}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p>No competitor analysis available</p>
                            )}
                          </div>

                          {/* SWOT Analysis */}
                          <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-2">
                              📈 SWOT Analysis
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold">Strengths</h4>
                                <ul className="list-disc list-inside">
                                  {swotAnalysis.strengths.map(
                                    (strength, index) => (
                                      <li key={index}>{strength}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold">Weaknesses</h4>
                                <ul className="list-disc list-inside">
                                  {swotAnalysis.weaknesses.map(
                                    (weakness, index) => (
                                      <li key={index}>{weakness}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold">Opportunities</h4>
                                <ul className="list-disc list-inside">
                                  {swotAnalysis.opportunities.map(
                                    (opportunity, index) => (
                                      <li key={index}>{opportunity}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold">Threats</h4>
                                <ul className="list-disc list-inside">
                                  {swotAnalysis.threats.map((threat, index) => (
                                    <li key={index}>{threat}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Industry Trends */}
                          <div>
                            <h3 className="text-xl font-semibold mb-2">
                              🚀 Industry Trends
                            </h3>
                            {industryTrends.map((trend, index) => (
                              <div key={index} className="mb-2">
                                <strong>{trend.name}:</strong> {trend.growth}%
                                growth
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                <AnimatePresence>
                  {showPitchOverlay && (
                    <Draggable
                      handle=".drag-handle"
                      bounds="body"
                      defaultPosition={{
                        x: window.innerWidth * 0.6,
                        y: window.innerHeight * 0.2,
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3 }}
                        className={`fixed bg-white shadow-lg overflow-hidden z-[1000] rounded-lg ${
                          isPitchPanelCollapsed
                            ? "w-64 h-10"
                            : "w-1/3 h-auto max-h-[80vh]"
                        }`}
                      >
                        <div className="flex justify-between items-center h-10 bg-gray-200 px-4 drag-handle cursor-move">
                          <h2 className="text-xl font-bold truncate">
                            Business Idea Pitch
                          </h2>
                          <div className="flex items-center">
                            <button
                              onClick={() =>
                                setIsPitchPanelCollapsed(!isPitchPanelCollapsed)
                              }
                              className="ml-2 text-gray-500 hover:text-gray-700"
                            >
                              {isPitchPanelCollapsed ? "Expand" : "Collapse"}
                            </button>
                            <button
                              onClick={() => setShowPitchOverlay(false)}
                              className="ml-2 text-gray-500 hover:text-gray-700"
                            ></button>
                          </div>
                        </div>
                        {!isPitchPanelCollapsed && (
                          <div
                            className="p-4 overflow-y-auto"
                            style={{ maxHeight: "calc(80vh - 40px)" }}
                          >
                            <PitchPresentation
                              pitch={generatedPitch}
                              progress={generationProgress}
                              estimatedTime={estimatedGenerationTime}
                            />
                          </div>
                        )}
                      </motion.div>
                    </Draggable>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <ForceControlPanel
        linkStrength={linkStrength}
        setLinkStrength={setLinkStrength}
        chargeStrength={chargeStrength}
        setChargeStrength={setChargeStrength}
        collideStrength={collideStrength}
        setCollideStrength={setCollideStrength}
        centerStrength={centerStrength}
        setCenterStrength={setCenterStrength}
      />
    </>
  );
}

export default EnhancedBrainstormer;

function getLinePosition(start: any, end: any) {
  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
  };
}
