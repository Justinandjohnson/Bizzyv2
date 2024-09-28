import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Button, Input } from "@/components/ui";
import { Loader, ZoomIn, ZoomOut } from "lucide-react";
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
const MemoizedForceGraph2D = React.memo(ForceGraph2D);

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

export function MindMapTab({ currentIdea }: { currentIdea: string }) {
  const [initialIdea, setInitialIdea] = useState(currentIdea);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [linkDistances, setLinkDistances] = useState<{ [key: string]: number }>(
    {}
  );
  const [mindMapWidth, setMindMapWidth] = useState(1200);
  const [mindMapHeight, setMindMapHeight] = useState(800);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const graphRef = useRef<ForceGraphMethods<Node, Link> | null>(null);

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

  const debouncedHandleInitialIdeaChange = useCallback(
    debounce((value: string) => setInitialIdea(value), 300),
    []
  );

  const handleInitialIdeaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedHandleInitialIdeaChange(e.target.value);
  };

  const handleInitialIdeaKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && initialIdea.trim() && !isLoading) {
      handleGenerateMindMap();
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
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const subNodes = data.nodes
        .slice(0, 6)
        .map((node: Node, index: number) => ({
          ...node,
          x: centerX + radius * Math.cos((2 * Math.PI * index) / 6),
          y: centerY + radius * Math.sin((2 * Math.PI * index) / 6),
          val: 20,
        }));

      const links = subNodes.map((node: Node) => ({
        source: centerNode.id,
        target: node.id,
      }));

      setGraphData({ nodes: [centerNode, ...subNodes], links });
    } catch (error: any) {
      console.error("Error generating mind map:", error);
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
          initialIdea,
        }),
      });
      const newData = await response.json();
      if (newData.nodes && Array.isArray(newData.nodes)) {
        const depth = node.id.split("_").length - 1 + 1;
        const angleStep = Math.PI / 6;
        const radius = 80 / depth;
        const startAngle = (-angleStep * (newData.nodes.length - 1)) / 2;

        const subNodes = newData.nodes.map((newNode: Node, index: number) => ({
          ...newNode,
          id: `${node.id}_${index}`,
          x: node.x! + radius * Math.cos(startAngle + angleStep * index),
          y: node.y! - radius * Math.sin(startAngle + angleStep * index),
          val: 15,
          parentId: node.id,
          depth,
        }));

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

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNodes((prev) => {
      const isAlreadySelected = prev.some((n) => n.id === node.id);
      return isAlreadySelected
        ? prev.filter((n) => n.id !== node.id)
        : [...prev, node];
    });
    setSelectedNodeId(node.id);
    expandNode(node);
  }, []);

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

  const handleLinkDragStart = useCallback((event: MouseEvent, link: Link) => {
    // Implement link drag start logic
  }, []);

  const handleLinkShorten = useCallback((link: Link) => {
    setLinkDistances((prev) => {
      const currentDistance = prev[`${link.source}-${link.target}`] || 50;
      return {
        ...prev,
        [`${link.source}-${link.target}`]: currentDistance * 0.8,
      };
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
      // Handle the final idea (e.g., display it to the user)
    } catch (error) {
      console.error("Error generating final idea:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
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
        {graphData.nodes.length > 0 && (
          <MemoizedForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node) => (node as Node).color || "#4299E1"}
            nodeVal={(node) => (node as Node).val}
            linkColor={() => "#CBD5E0"}
            onNodeClick={(node) => handleNodeClick(node as Node)}
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
                    return mindMapHeight * 0.3 + depth * 100;
                  })
                  .strength(0.3)
              );
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = (node as Node).name;
              const fontSize = 15 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(
                (n) => n + fontSize * 1.2
              );

              const nodeSize = Math.sqrt((node as Node).val) * 2;

              ctx.fillStyle =
                node.id === selectedNodeId
                  ? "#48BB78"
                  : node.id === "center"
                  ? "#FFA500"
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

              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#FFFFFF";
              ctx.fillText(label, node.x!, node.y!);

              if (!(node as Node).expanded && node.id !== "center") {
                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.moveTo(node.x! + nodeSize - fontSize / 2, node.y!);
                ctx.lineTo(node.x! + nodeSize + fontSize / 2, node.y!);
                ctx.moveTo(node.x! + nodeSize, node.y! - fontSize / 2);
                ctx.lineTo(node.x! + nodeSize, node.y! + fontSize / 2);
                ctx.stroke();
              }

              if (selectedNodes.some((n) => n.id === node.id)) {
                ctx.strokeStyle = "#FF0000";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, nodeSize + 2, 0, 2 * Math.PI);
                ctx.stroke();
              }
            }}
            linkCanvasObject={(link, ctx, globalScale) => {
              const start = link.source as Node;
              const end = link.target as Node;
              const textPos = {
                x: start.x! + (end.x! - start.x!) / 2,
                y: start.y! + (end.y! - start.y!) / 2,
              };

              ctx.beginPath();
              ctx.moveTo(start.x!, start.y!);
              ctx.lineTo(end.x!, end.y!);
              ctx.strokeStyle = "#CBD5E0";
              ctx.lineWidth = 2;
              ctx.stroke();

              ctx.fillStyle = "orange";
              ctx.beginPath();
              ctx.arc(textPos.x, textPos.y, 4, 0, 2 * Math.PI);
              ctx.fill();

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
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <Loader className="animate-spin text-blue-500" size={48} />
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
        onClick={generateFinalIdea}
        disabled={isLoading || selectedNodes.length === 0}
        className="mt-4"
      >
        Generate Final Idea
      </Button>
    </div>
  );
}

export default MindMapTab;
