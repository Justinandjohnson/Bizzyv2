import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface ForceControlPanelProps {
  linkStrength: number;
  setLinkStrength: (value: number) => void;
  chargeStrength: number;
  setChargeStrength: (value: number) => void;
  collideStrength: number;
  setCollideStrength: (value: number) => void;
  centerStrength: number;
  setCenterStrength: (value: number) => void;
}

export function ForceControlPanel({
  linkStrength,
  setLinkStrength,
  chargeStrength,
  setChargeStrength,
  collideStrength,
  setCollideStrength,
  centerStrength,
  setCenterStrength,
}: ForceControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg overflow-hidden">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center px-4 py-2"
      >
        <span>Force Controls</span>
        {isExpanded ? (
          <ChevronDown className="ml-2" />
        ) : (
          <ChevronUp className="ml-2" />
        )}
      </Button>
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label>Link Strength: {linkStrength}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={linkStrength}
              onChange={(e) => setLinkStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label>Charge Strength: {chargeStrength}</label>
            <input
              type="range"
              min="-1000"
              max="0"
              step="10"
              value={chargeStrength}
              onChange={(e) => setChargeStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label>Collide Strength: {collideStrength}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={collideStrength}
              onChange={(e) => setCollideStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label>Center Strength: {centerStrength}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={centerStrength}
              onChange={(e) => setCenterStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
