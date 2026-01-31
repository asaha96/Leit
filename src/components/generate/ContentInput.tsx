import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Upload, Sparkles, AlertCircle } from 'lucide-react';
import type { GenerateOptions } from '@/types/generate';

interface ContentInputProps {
  onGenerate: (content: string, options: GenerateOptions) => void;
  onPDFUpload: (file: File) => Promise<string>;
  isLoading?: boolean;
}

const MAX_CHARS = 50000;

export function ContentInput({ onGenerate, onPDFUpload, isLoading }: ContentInputProps) {
  const [textContent, setTextContent] = useState('');
  const [pdfText, setPdfText] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [cardCount, setCardCount] = useState('10');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentContent = activeTab === 'text' ? textContent : pdfText;
  const charCount = currentContent.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canGenerate = charCount > 0 && !isOverLimit && !isLoading && !isUploading;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setPdfFileName(file.name);

    try {
      const extractedText = await onPDFUpload(file);
      setPdfText(extractedText);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to extract PDF text');
      setPdfText('');
      setPdfFileName('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = () => {
    onGenerate(currentContent, {
      cardCount: parseInt(cardCount, 10),
      difficulty,
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Flashcard Generator
        </CardTitle>
        <CardDescription>
          Paste text or upload a PDF to generate flashcards automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-content">Content</Label>
              <Textarea
                id="text-content"
                placeholder="Paste your study material, notes, or any text you want to create flashcards from..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[200px] resize-y"
                disabled={isLoading}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className={isOverLimit ? 'text-destructive' : ''}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                </span>
                {isOverLimit && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Content too long
                  </span>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4">
            <div className="space-y-2">
              <Label>PDF File</Label>
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading || isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Extracting...' : 'Choose File'}
                </Button>
                {pdfFileName && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {pdfFileName}
                  </span>
                )}
              </div>
              {uploadError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </p>
              )}
            </div>

            {pdfText && (
              <div className="space-y-2">
                <Label>Extracted Text (Preview)</Label>
                <Textarea
                  value={pdfText}
                  onChange={(e) => setPdfText(e.target.value)}
                  className="min-h-[200px] resize-y"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className={isOverLimit ? 'text-destructive' : ''}>
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                  </span>
                  {isOverLimit && (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Content too long
                    </span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="card-count">Number of Cards</Label>
            <Select value={cardCount} onValueChange={setCardCount} disabled={isLoading}>
              <SelectTrigger id="card-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25, 30].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} cards
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}
              disabled={isLoading}
            >
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy (Basic Facts)</SelectItem>
                <SelectItem value="medium">Medium (Conceptual)</SelectItem>
                <SelectItem value="hard">Hard (Application)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full"
          size="lg"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isLoading ? 'Generating...' : 'Generate Flashcards'}
        </Button>
      </CardContent>
    </Card>
  );
}
