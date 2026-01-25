"use client";

import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import {Stage, Layer, Image as KonvaImage, Line, Rect} from "react-konva";
import {Asset} from "@/lib/api";

type CanvasSize = {width: number; height: number};

export type EditorCanvasRef = {
  exportDataUrl: () => string | null;
  exportDownload: (filename: string) => void;
};

type Props = {
  size: CanvasSize;
  bg?: Asset;
  text?: Asset;
  elements: Asset[];
};

function useImage(url?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}

export const EditorCanvas = forwardRef<EditorCanvasRef, Props>(({size, bg, text, elements}, ref) => {
  const stageRef = useRef<any>(null);
  const bgImage = useImage(bg?.publicUrl);
  const textImage = useImage(text?.publicUrl);
  const elementImages = elements.map((asset) => ({asset, image: useImage(asset.publicUrl)}));

  const [positions, setPositions] = useState<Record<string, {x: number; y: number}>>({});

  const gridLines = useMemo(() => {
    const spacing = 60;
    const lines: number[] = [];
    for (let x = spacing; x < size.width; x += spacing) {
      lines.push(x);
    }
    return lines;
  }, [size.width]);

  useImperativeHandle(ref, () => ({
    exportDataUrl: () => stageRef.current?.toDataURL({pixelRatio: 2}) ?? null,
    exportDownload: (filename: string) => {
      const dataUrl = stageRef.current?.toDataURL({pixelRatio: 2});
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }));

  const getPosition = (asset: Asset, fallback: {x: number; y: number}) => {
    return positions[asset.id] ?? fallback;
  };

  const updatePosition = (asset: Asset, x: number, y: number) => {
    setPositions((prev) => ({...prev, [asset.id]: {x, y}}));
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-white p-3">
      <div className="text-sm font-medium">Editor</div>
      <div className="mt-3 flex justify-center">
        <Stage ref={stageRef} width={size.width} height={size.height} className="border bg-white">
          <Layer>
            <Rect width={size.width} height={size.height} fill="#f8fafc" />
            {bgImage && (
              <KonvaImage image={bgImage} width={size.width} height={size.height} />
            )}
          </Layer>

          <Layer>
            {gridLines.map((x) => (
              <Line key={`v-${x}`} points={[x, 0, x, size.height]} stroke="#e5e7eb" strokeWidth={1} />
            ))}
            {gridLines.map((y) => (
              <Line key={`h-${y}`} points={[0, y, size.width, y]} stroke="#e5e7eb" strokeWidth={1} />
            ))}
            <Line points={[size.width / 2, 0, size.width / 2, size.height]} stroke="#d1d5db" dash={[6, 6]} />
            <Line points={[0, size.height / 2, size.width, size.height / 2]} stroke="#d1d5db" dash={[6, 6]} />
          </Layer>

          <Layer>
            {textImage && text && (
              <KonvaImage
                image={textImage}
                x={getPosition(text, {x: size.width / 2 - 150, y: size.height / 2 - 150}).x}
                y={getPosition(text, {x: size.width / 2 - 150, y: size.height / 2 - 150}).y}
                draggable
                onDragEnd={(e) => updatePosition(text, e.target.x(), e.target.y())}
              />
            )}
            {elementImages.map(({asset, image}) =>
              image ? (
                <KonvaImage
                  key={asset.id}
                  image={image}
                  x={getPosition(asset, {x: size.width / 2 - 100, y: size.height / 2 - 100}).x}
                  y={getPosition(asset, {x: size.width / 2 - 100, y: size.height / 2 - 100}).y}
                  draggable
                  onDragEnd={(e) => updatePosition(asset, e.target.x(), e.target.y())}
                />
              ) : null
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
});

EditorCanvas.displayName = "EditorCanvas";
