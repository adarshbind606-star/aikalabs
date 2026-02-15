import { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, X, Link, ZoomIn } from "lucide-react";

interface AvatarEditorProps {
  avatarUrl: string;
  onSave: (url: string) => void;
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<string> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, size, size
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

export function AvatarEditor({ avatarUrl, onSave }: AvatarEditorProps) {
  const [urlInput, setUrlInput] = useState(avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    setCropSrc(urlInput.trim());
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropSave = async () => {
    if (!cropSrc || !croppedArea) return;
    try {
      const cropped = await getCroppedImg(cropSrc, croppedArea);
      onSave(cropped);
      setCropSrc(null);
    } catch {
      // If CORS blocks cropping (external URL), save the raw URL
      onSave(cropSrc);
      setCropSrc(null);
    }
  };

  const handleRemove = () => {
    setUrlInput("");
    onSave("");
  };

  return (
    <div className="space-y-3">
      {/* Current avatar preview */}
      {avatarUrl && (
        <div className="flex items-center gap-3">
          <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full border border-border object-cover" />
          <Button variant="outline" size="sm" onClick={handleRemove} className="gap-1.5 text-destructive hover:text-destructive">
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      )}

      {/* URL input */}
      <div className="space-y-2">
        <Label>Avatar URL</Label>
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/avatar.png"
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()} className="gap-1.5 shrink-0">
            <Link className="h-3.5 w-3.5" /> Use URL
          </Button>
        </div>
      </div>

      {/* File upload */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Upload from Device
        </Button>
      </div>

      {/* Crop dialog */}
      <Dialog open={!!cropSrc} onOpenChange={(open) => !open && setCropSrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Avatar</DialogTitle>
          </DialogHeader>
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropSrc(null)}>Cancel</Button>
            <Button onClick={handleCropSave}>Save Avatar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
