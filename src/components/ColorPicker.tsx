import { useState } from 'react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  // Primary colors
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  // Bright colors
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  // Dark colors
  '#2C3E50', '#34495E', '#1A1A2E', '#16213E', '#0F3460', '#533483',
  // Warm colors
  '#E74C3C', '#E67E22', '#F39C12', '#D35400', '#C0392B', '#8E44AD',
  // Cool colors
  '#3498DB', '#2980B9', '#1ABC9C', '#16A085', '#27AE60', '#2ECC71',
  // Neutrals
  '#FFFFFF', '#BDC3C7', '#95A5A6', '#7F8C8D', '#2C2C2C', '#000000',
];

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(selectedColor);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Select Color</h3>
      
      {/* Preset colors grid */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={cn(
              'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
              selectedColor === color
                ? 'border-primary ring-2 ring-primary/50'
                : 'border-transparent hover:border-muted-foreground/50'
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground">Custom:</label>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              onColorChange(e.target.value);
            }}
            className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
          />
          <input
            type="text"
            value={selectedColor}
            onChange={(e) => {
              const value = e.target.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                onColorChange(value);
                setCustomColor(value);
              }
            }}
            placeholder="#FF0000"
            className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Current selection preview */}
      <div className="mt-4 flex items-center gap-3 p-3 bg-muted rounded-lg">
        <div 
          className="w-12 h-12 rounded-lg border-2 border-border shadow-lg"
          style={{ backgroundColor: selectedColor }}
        />
        <div>
          <div className="text-xs text-muted-foreground">Selected</div>
          <div className="font-mono text-sm text-foreground">{selectedColor}</div>
        </div>
      </div>
    </div>
  );
}
