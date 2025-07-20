"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default";
}

export function CopyButton({ 
  value, 
  className, 
  size = "sm", 
  variant = "ghost" 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("transition-all duration-200", className)}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
} 