"use client";

import { generateStoryForChapter } from "@/app/actions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type {
  ChapterId,
  Game,
  GameId,
  Message,
  PlayerState,
  Story,
  TokenUsage,
  User,
} from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { LoaderCircle, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { deleteUser, getPlayerLogs, getPlayerState } from "./actions";

interface GameStats {
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// Read pricing from environment variables (defaults to Gemini Flash Lite pricing)
// These are used for legacy logs and story generation costs
const PRICING = {
  input: parseFloat(process.env.PRIMARY_AI_INPUT_COST || "0.10") / 1_000_000,
  output: parseFloat(process.env.PRIMARY_AI_OUTPUT_COST || "0.40") / 1_000_000,
};

function calculateCostForUsage(usage: TokenUsage): number {
  if (!usage) return 0;
  const inputCost = (usage.inputTokens || 0) * PRICING.input;
  // The output price is based on the total tokens (including "thinking tokens")
  const outputCost = (usage.totalTokens || 0) * PRICING.output;
  return inputCost + outputCost;
}

function calculateStats(
  logs: Message[],
  stories: Record<ChapterId, Story>
): GameStats {
  let totalMessages = logs.length;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  let estimatedCost = 0;

  logs.forEach((log) => {
    // Handle legacy message format (log.usage)
    if (log.usage) {
      totalInputTokens += log.usage.inputTokens || 0;
      totalOutputTokens += log.usage.outputTokens || 0;
      totalTokens += log.usage.totalTokens || 0;
      // Legacy messages: recalculate cost using primary AI pricing
      const legacyCost =
        (log.usage.inputTokens || 0) * PRICING.input +
        (log.usage.totalTokens || 0) * PRICING.output;
      estimatedCost += legacyCost;
    }

    // Handle consolidated command format (log.tokens)
    if ((log as any).type === "command") {
      // Accumulate tokens if available
      if ((log as any).tokens) {
        const tokens = (log as any).tokens;
        totalInputTokens += tokens.input || 0;
        totalOutputTokens += tokens.output || 0;
        totalTokens += tokens.total || 0;
      }

      // Use pre-calculated cost from aiInterpretation.totalCostUSD if available
      // This accounts for different pricing of Primary/Safety/Help AI
      if ((log as any).aiInterpretation?.totalCostUSD !== undefined) {
        estimatedCost += (log as any).aiInterpretation.totalCostUSD;
      }
    }
  });

  Object.values(stories).forEach((story) => {
    if (story.usage) {
      totalInputTokens += story.usage.inputTokens || 0;
      totalOutputTokens += story.usage.outputTokens || 0;
      totalTokens += story.usage.totalTokens || 0;
      // Story generation: recalculate cost using primary AI pricing
      const storyCost =
        (story.usage.inputTokens || 0) * PRICING.input +
        (story.usage.totalTokens || 0) * PRICING.output;
      estimatedCost += storyCost;
    }
  });

  return {
    totalMessages,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    estimatedCost,
  };
}

const PlayerDetails = ({ user, games }: { user: User; games: Game[] }) => {
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<GameId | null>(
    null
  );
  const [state, setState] = useState<PlayerState | null>(null);
  const [logs, setLogs] = useState<Message[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoryPending, startStoryTransition] = useTransition();
  const { toast } = useToast();

  // Get available chapters for this user
  const userChapters = games.filter((g) => user.purchasedGames.includes(g.id));

  // Group chapters by game name (extract base name before " - Chapter")
  const chaptersByGame = useMemo(() => {
    const grouped: Record<string, Game[]> = {};
    userChapters.forEach((chapter) => {
      // Extract base game name: "Walk in Justice - Chapter 0" → "Walk in Justice"
      const baseName = chapter.title.split(" - Chapter")[0].trim();
      if (!grouped[baseName]) {
        grouped[baseName] = [];
      }
      grouped[baseName].push(chapter);
    });
    // Sort chapters within each game
    Object.keys(grouped).forEach((gameName) => {
      grouped[gameName].sort((a, b) => {
        // Extract chapter numbers for sorting
        const getChapterNum = (title: string) => {
          const match = title.match(/Chapter\s*(\d+)/i);
          return match ? parseInt(match[1]) : 0;
        };
        return getChapterNum(a.title) - getChapterNum(b.title);
      });
    });
    return grouped;
  }, [userChapters]);

  const gameNames = Object.keys(chaptersByGame);
  const selectedGameChapters = selectedGameName
    ? chaptersByGame[selectedGameName]
    : [];
  const selectedChapter = selectedGameChapters.find(
    (g) => g.id === selectedChapterId
  );

  // Auto-select first game and chapter when user changes
  useEffect(() => {
    if (gameNames.length > 0 && !selectedGameName) {
      const firstGameName = gameNames[0];
      setSelectedGameName(firstGameName);
      if (chaptersByGame[firstGameName].length > 0) {
        setSelectedChapterId(chaptersByGame[firstGameName][0].id);
      }
    }
  }, [user.id, gameNames.length]);

  const fetchData = useCallback(async () => {
    if (!user || !selectedChapterId) return;
    console.log(
      `[Admin] Fetching data for user ${user.id}, chapter ${selectedChapterId}`
    );
    setIsLoading(true);
    const [stateData, logsData] = await Promise.all([
      getPlayerState(user.id, selectedChapterId),
      getPlayerLogs(user.id, selectedChapterId),
    ]);
    console.log(`[Admin] Received logs:`, logsData);
    console.log(`[Admin] Number of logs:`, logsData?.length || 0);
    setState(stateData);
    setLogs(logsData);
    if (logsData && stateData) {
      setStats(calculateStats(logsData, stateData.stories || {}));
    }
    setIsLoading(false);
  }, [user.id, selectedChapterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateStory = () => {
    if (!user || !selectedChapter || !state) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot generate story without user or game data.",
      });
      return;
    }
    startStoryTransition(async () => {
      try {
        toast({
          title: "Crafting Story...",
          description: `The AI is writing a story for ${user.username}. This may take a moment.`,
        });
        const { newState } = await generateStoryForChapter(
          user.id,
          selectedChapter.id,
          state.currentChapterId
        );
        setState(newState); // Update local state
        if (logs) {
          setStats(calculateStats(logs, newState.stories || {}));
        }
        toast({
          title: "Story Complete!",
          description: `Personalized story for ${user.username} has been created.`,
        });
      } catch (error) {
        console.error("Generate Story error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
          variant: "destructive",
          title: "Story Generation Failed",
          description: errorMessage,
        });
      }
    });
  };

  const stories = state?.stories ? Object.values(state.stories) : [];
  const hasStoryForCurrentChapter =
    state?.stories && state.stories[state.currentChapterId];

  // Show message if no chapter is selected yet
  if (!selectedChapter) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">
          Select a game and chapter to view details
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Select game and chapter to view logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Game and Chapter Selector */}
          {gameNames.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Games:</p>
              <Accordion type="single" collapsible className="w-full">
                {gameNames.map((gameName) => {
                  const chapters = chaptersByGame[gameName];
                  return (
                    <AccordionItem key={gameName} value={gameName}>
                      <AccordionTrigger className="text-sm py-2">
                        {gameName}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-2 pl-4">
                          {chapters.map((chapter) => {
                            // Extract chapter label: "Walk in Justice - Chapter 0" → "Chapter 0"
                            const chapterLabel =
                              chapter.title.split(" - ")[1] || chapter.title;
                            return (
                              <Button
                                key={chapter.id}
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedChapterId(chapter.id)}
                                className={`w-full justify-start ${
                                  selectedChapterId === chapter.id
                                    ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                                    : ""
                                }`}
                              >
                                {chapterLabel}
                              </Button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}
          <ScrollArea className="h-[calc(80vh-6rem)]">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Current State</AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(state, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  Generated Stories ({stories.length})
                </AccordionTrigger>
                <AccordionContent>
                  {stories.length > 0 ? (
                    stories.map((story) => (
                      <div key={story.chapterId} className="mb-4 pb-2 border-b">
                        <h4 className="font-bold text-sm mb-1">
                          {story.title}
                        </h4>
                        <p className="text-xs whitespace-pre-wrap">
                          {story.content}
                        </p>
                        {story.usage && (
                          <p className="text-muted-foreground text-right text-xs mt-1">
                            Tokens: {story.usage.totalTokens} (~$
                            {calculateCostForUsage(story.usage).toFixed(6)})
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No stories have been generated yet.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>
      <div className="lg:col-span-2 grid grid-rows-6 gap-4">
        <Card className="row-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Game Stats: {selectedChapter.title}</CardTitle>
            <Button
              size="sm"
              onClick={handleGenerateStory}
              disabled={isStoryPending || !!hasStoryForCurrentChapter}
            >
              <Sparkles
                className={cn("mr-2 h-4 w-4", isStoryPending && "animate-spin")}
              />
              {isStoryPending
                ? "Generating..."
                : hasStoryForCurrentChapter
                ? "Story Exists"
                : "Generate Story"}
            </Button>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-bold">Total Msgs</p>
                  <p>{stats.totalMessages}</p>
                </div>
                <div>
                  <p className="font-bold">Total Tokens</p>
                  <p>{stats.totalTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-bold">I/O Tokens</p>
                  <p>
                    {stats.totalInputTokens.toLocaleString()} /{" "}
                    {stats.totalOutputTokens.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-bold">Est. Cost</p>
                  <p>${stats.estimatedCost.toFixed(6)}</p>
                </div>
              </div>
            ) : (
              <p>No stats available.</p>
            )}
          </CardContent>
        </Card>
        <Card className="row-span-5">
          <CardHeader>
            <CardTitle>Message Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-[calc(80vh-14rem)]">
                <LoaderCircle className="animate-spin h-8 w-8" />
              </div>
            ) : (
              <ScrollArea className="h-[calc(80vh-14rem)]">
                <Accordion type="multiple" className="w-full">
                  {logs.map((log: any, index) => {
                    // Check log type
                    const isCommandLog = log.type === "command";
                    const isValidationError = log.type === "validation_error";
                    const isInvalidCommand = log.type === "command_invalid";
                    const isAIError = log.type === "ai_error";
                    const isDBError = log.type === "db_error";

                    // Validation Error Log
                    if (isValidationError) {
                      return (
                        <AccordionItem
                          key={log.errorId || index}
                          value={`error-${index}`}
                        >
                          <AccordionTrigger className="text-xs py-2">
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-mono bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded text-red-700 dark:text-red-300 font-bold">
                                Msg Error
                              </span>
                              <span className="flex-1 text-left truncate text-red-600 dark:text-red-400">
                                "
                                {log.originalInput?.substring(0, 60) ||
                                  "No input"}
                                {log.originalInput?.length > 60 ? "..." : ""}"
                              </span>
                              <span className="text-red-600 dark:text-red-400">
                                ✗
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-xs">
                              {/* Original Input Section */}
                              <div className="border-l-2 border-red-500 pl-3">
                                <p className="font-bold text-red-600 dark:text-red-400">
                                  🚫 Blocked Input
                                </p>
                                <p className="mt-1">
                                  <strong>Original (Unfiltered):</strong>
                                </p>
                                <p className="bg-red-50 dark:bg-red-900/20 p-2 rounded mt-1 whitespace-pre-wrap break-all">
                                  {log.originalInput}
                                </p>
                                <p className="mt-2 text-muted-foreground">
                                  Length: {log.metadata?.originalLength}{" "}
                                  characters
                                </p>
                              </div>

                              {/* Violations Section */}
                              <div className="border-l-2 border-orange-500 pl-3">
                                <p className="font-bold text-orange-600 dark:text-orange-400">
                                  ⚠️ Violations ({log.violations?.length || 0})
                                </p>
                                <div className="mt-1 space-y-2">
                                  {log.violations?.map(
                                    (violation: any, vIdx: number) => (
                                      <div
                                        key={vIdx}
                                        className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded"
                                      >
                                        <p className="font-semibold">
                                          {violation.type.replace(/_/g, " ")}
                                          <span
                                            className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                              violation.severity === "critical"
                                                ? "bg-red-600 text-white"
                                                : violation.severity === "high"
                                                ? "bg-orange-600 text-white"
                                                : "bg-yellow-600 text-white"
                                            }`}
                                          >
                                            {violation.severity}
                                          </span>
                                        </p>
                                        <p className="mt-1 text-muted-foreground">
                                          {violation.message}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* System Response Section */}
                              {log.systemResponse && (
                                <div className="border-l-2 border-green-500 pl-3">
                                  <p className="font-bold text-green-600 dark:text-green-400">
                                    💬 System Response
                                  </p>
                                  <p className="mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded whitespace-pre-wrap">
                                    {log.systemResponse}
                                  </p>
                                </div>
                              )}

                              {/* Metadata Section */}
                              <div className="border-l-2 border-gray-500 pl-3">
                                <p className="font-bold">📊 Metadata</p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <p>
                                    <strong>Original Length:</strong>{" "}
                                    {log.metadata?.originalLength} chars
                                  </p>
                                  <p>
                                    <strong>Sanitized Length:</strong>{" "}
                                    {log.metadata?.sanitizedLength} chars
                                  </p>
                                  <p>
                                    <strong>Stripped:</strong>{" "}
                                    {log.metadata?.strippedChars} chars
                                  </p>
                                  <p>
                                    <strong>Timestamp:</strong>{" "}
                                    {new Date(
                                      log.timestamp
                                    ).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>

                              {/* Context Section */}
                              {log.context && (
                                <div className="border-l-2 border-blue-500 pl-3">
                                  <p className="font-bold text-blue-600 dark:text-blue-400">
                                    📍 Context
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p>
                                      <strong>User ID:</strong>{" "}
                                      {log.context.userId}
                                    </p>
                                    <p>
                                      <strong>Game ID:</strong>{" "}
                                      {log.context.gameId}
                                    </p>
                                    <p>
                                      <strong>Chapter:</strong>{" "}
                                      {log.context.chapterId}
                                    </p>
                                    <p>
                                      <strong>Location:</strong>{" "}
                                      {log.context.locationId}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    }

                    // Invalid Command Log
                    if (isInvalidCommand) {
                      const isGated = log.invalidationType === "gated_content";
                      return (
                        <AccordionItem
                          key={log.errorId || index}
                          value={`invalid-${index}`}
                        >
                          <AccordionTrigger className="text-xs py-2">
                            <div className="flex items-center gap-2 w-full">
                              <span
                                className={`font-mono px-2 py-0.5 rounded font-bold ${
                                  isGated
                                    ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {isGated ? "Gated" : "Invalid"}
                              </span>
                              <span className="flex-1 text-left truncate text-muted-foreground">
                                "
                                {log.playerInput?.substring(0, 60) ||
                                  "No input"}
                                {log.playerInput?.length > 60 ? "..." : ""}"
                              </span>
                              <span className="text-muted-foreground">⚠</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-xs">
                              {/* Player Input Section */}
                              <div className="border-l-2 border-purple-500 pl-3">
                                <p className="font-bold text-purple-600 dark:text-purple-400">
                                  📥 Player Input
                                </p>
                                <p className="mt-1">
                                  <strong>Command:</strong> {log.playerInput}
                                </p>
                                {log.rawInput &&
                                  log.rawInput !== log.playerInput && (
                                    <p>
                                      <strong>Raw Input:</strong> {log.rawInput}
                                    </p>
                                  )}
                              </div>

                              {/* Classification Section */}
                              <div
                                className={`border-l-2 pl-3 ${
                                  isGated
                                    ? "border-purple-500"
                                    : "border-gray-500"
                                }`}
                              >
                                <p
                                  className={`font-bold ${
                                    isGated
                                      ? "text-purple-600 dark:text-purple-400"
                                      : "text-gray-600 dark:text-gray-400"
                                  }`}
                                >
                                  🏷️ Classification
                                </p>
                                <div className="mt-1 bg-muted/50 p-2 rounded">
                                  <p>
                                    <strong>Type:</strong>{" "}
                                    {isGated
                                      ? "Gated Content"
                                      : "Invalid Command"}
                                  </p>
                                  {isGated && (
                                    <p className="mt-1 text-purple-700 dark:text-purple-300">
                                      ℹ️ Player tried to access content that
                                      exists but is not yet revealed/accessible
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* System Response Section */}
                              {log.systemResponse && (
                                <div className="border-l-2 border-green-500 pl-3">
                                  <p className="font-bold text-green-600 dark:text-green-400">
                                    💬 System Response
                                  </p>
                                  <p className="mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded whitespace-pre-wrap">
                                    {log.systemResponse}
                                  </p>
                                </div>
                              )}

                              {/* AI Interpretation Section */}
                              {log.aiInterpretation && (
                                <div className="border-l-2 border-blue-500 pl-3">
                                  <p className="font-bold text-blue-600 dark:text-blue-400">
                                    🤖 AI Analysis
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p>
                                      <strong>Confidence:</strong>{" "}
                                      {(
                                        (log.aiInterpretation.confidence || 0) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </p>
                                    <p>
                                      <strong>Source:</strong>{" "}
                                      {log.aiInterpretation.source}
                                    </p>
                                    {log.aiInterpretation.reasoning && (
                                      <>
                                        <p className="mt-2">
                                          <strong>Reasoning:</strong>
                                        </p>
                                        <p className="mt-1 text-xs bg-muted/50 p-2 rounded">
                                          {log.aiInterpretation.reasoning}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Context Section */}
                              {log.context && (
                                <div className="border-l-2 border-gray-500 pl-3">
                                  <p className="font-bold">📍 Context</p>
                                  <div className="mt-1 space-y-1">
                                    <p>
                                      <strong>Chapter:</strong>{" "}
                                      {log.context.chapterId}
                                    </p>
                                    <p>
                                      <strong>Location:</strong>{" "}
                                      {log.context.locationId}
                                    </p>
                                    {log.context.focusId && (
                                      <p>
                                        <strong>Focus:</strong>{" "}
                                        {log.context.focusId} (
                                        {log.context.focusType})
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Metadata Section */}
                              <div className="border-l-2 border-gray-500 pl-3">
                                <p className="font-bold">📊 Metadata</p>
                                <p>
                                  <strong>Error ID:</strong> {log.errorId}
                                </p>
                                <p>
                                  <strong>Timestamp:</strong>{" "}
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    }

                    // AI Error Log
                    if (isAIError) {
                      return (
                        <AccordionItem
                          key={log.errorId || index}
                          value={`ai-error-${index}`}
                        >
                          <AccordionTrigger className="text-xs py-2">
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-mono bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded text-orange-700 dark:text-orange-300 font-bold">
                                AI Error
                              </span>
                              <span className="flex-1 text-left truncate text-orange-600 dark:text-orange-400">
                                "
                                {log.playerInput?.substring(0, 60) ||
                                  "No input"}
                                {log.playerInput?.length > 60 ? "..." : ""}"
                              </span>
                              <span className="text-orange-600 dark:text-orange-400">
                                ⚠
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-xs">
                              {/* Player Input Section */}
                              <div className="border-l-2 border-orange-500 pl-3">
                                <p className="font-bold text-orange-600 dark:text-orange-400">
                                  📥 Player Input
                                </p>
                                <p className="mt-1">
                                  <strong>Sanitized:</strong> {log.playerInput}
                                </p>
                                {log.rawInput &&
                                  log.rawInput !== log.playerInput && (
                                    <p className="mt-1">
                                      <strong>Original:</strong> {log.rawInput}
                                    </p>
                                  )}
                              </div>

                              {/* Error Details Section */}
                              <div className="border-l-2 border-red-500 pl-3">
                                <p className="font-bold text-red-600 dark:text-red-400">
                                  ❌ Error Details
                                </p>
                                <div className="mt-1 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                  <p>
                                    <strong>Source:</strong>{" "}
                                    <span className="font-mono text-xs">
                                      {log.error?.source || "UNKNOWN"}
                                    </span>
                                  </p>
                                  <p>
                                    <strong>Type:</strong>{" "}
                                    {log.error?.name || "Error"}
                                  </p>
                                  <p className="mt-2">
                                    <strong>Message:</strong>
                                  </p>
                                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                                    {log.error?.message}
                                  </p>
                                  {log.error?.stack && (
                                    <>
                                      <p className="mt-2">
                                        <strong>Stack Trace:</strong>
                                      </p>
                                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                                        {log.error.stack}
                                      </pre>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* System Response Section */}
                              {log.systemResponse && (
                                <div className="border-l-2 border-green-500 pl-3">
                                  <p className="font-bold text-green-600 dark:text-green-400">
                                    💬 System Response (to Player)
                                  </p>
                                  <p className="mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded whitespace-pre-wrap">
                                    {log.systemResponse}
                                  </p>
                                </div>
                              )}

                              {/* AI Context Section (if available) */}
                              {log.aiContext && (
                                <div className="border-l-2 border-purple-500 pl-3">
                                  <p className="font-bold text-purple-600 dark:text-purple-400">
                                    🤖 AI Context
                                  </p>
                                  {log.aiContext.hadAIInterpretation !==
                                    undefined && (
                                    <p>
                                      <strong>Had AI Interpretation:</strong>{" "}
                                      {log.aiContext.hadAIInterpretation
                                        ? "Yes"
                                        : "No"}
                                    </p>
                                  )}
                                  {log.aiContext.hadSafetyNet !== undefined && (
                                    <p>
                                      <strong>Had Safety Net:</strong>{" "}
                                      {log.aiContext.hadSafetyNet
                                        ? "Yes"
                                        : "No"}
                                    </p>
                                  )}
                                  {log.aiContext.commandStartTime && (
                                    <p>
                                      <strong>Command Start:</strong>{" "}
                                      {new Date(
                                        log.aiContext.commandStartTime
                                      ).toLocaleTimeString()}
                                    </p>
                                  )}
                                  {/* AI Reasoning Error fields */}
                                  {log.aiContext.commandToExecute && (
                                    <p className="mt-2">
                                      <strong>Command To Execute:</strong>{" "}
                                      <span className="font-mono text-xs bg-purple-50 dark:bg-purple-900/20 px-1 rounded">
                                        {log.aiContext.commandToExecute}
                                      </span>
                                    </p>
                                  )}
                                  {log.aiContext.confidence !== undefined && (
                                    <p>
                                      <strong>Confidence:</strong>{" "}
                                      {log.aiContext.confidence}
                                    </p>
                                  )}
                                  {log.aiContext.reasoning && (
                                    <>
                                      <p className="mt-2">
                                        <strong>AI Reasoning:</strong>
                                      </p>
                                      <p className="mt-1 text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded whitespace-pre-wrap">
                                        {log.aiContext.reasoning}
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Context Section */}
                              {log.context && (
                                <div className="border-l-2 border-blue-500 pl-3">
                                  <p className="font-bold text-blue-600 dark:text-blue-400">
                                    📍 Context
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p>
                                      <strong>User ID:</strong>{" "}
                                      {log.context.userId}
                                    </p>
                                    <p>
                                      <strong>Game ID:</strong>{" "}
                                      {log.context.gameId}
                                    </p>
                                    <p>
                                      <strong>Chapter:</strong>{" "}
                                      {log.context.chapterId}
                                    </p>
                                    <p>
                                      <strong>Location:</strong>{" "}
                                      {log.context.locationId}
                                    </p>
                                    {log.context.focusId && (
                                      <p>
                                        <strong>Focus:</strong>{" "}
                                        {log.context.focusId} (
                                        {log.context.focusType})
                                      </p>
                                    )}
                                    {log.context.activeConversation && (
                                      <p>
                                        <strong>In Conversation With:</strong>{" "}
                                        {log.context.activeConversation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Metadata Section */}
                              <div className="border-l-2 border-gray-500 pl-3">
                                <p className="font-bold">📊 Metadata</p>
                                <p>
                                  <strong>Error ID:</strong> {log.errorId}
                                </p>
                                <p>
                                  <strong>Timestamp:</strong>{" "}
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    }

                    // Database Error Log
                    if (isDBError) {
                      return (
                        <AccordionItem
                          key={log.errorId || index}
                          value={`db-error-${index}`}
                        >
                          <AccordionTrigger className="text-xs py-2">
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-mono bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 rounded text-yellow-700 dark:text-yellow-300 font-bold">
                                DB Error
                              </span>
                              <span className="flex-1 text-left truncate text-yellow-600 dark:text-yellow-400">
                                {log.operationDescription || log.operation}
                              </span>
                              <span className="text-yellow-600 dark:text-yellow-400">
                                ⚠
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-xs">
                              {/* Operation Details Section */}
                              <div className="border-l-2 border-yellow-500 pl-3">
                                <p className="font-bold text-yellow-600 dark:text-yellow-400">
                                  💾 Database Operation
                                </p>
                                <div className="mt-1 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                  <p>
                                    <strong>Operation:</strong>{" "}
                                    <span className="font-mono text-xs">
                                      {log.operation}
                                    </span>
                                  </p>
                                  <p>
                                    <strong>Description:</strong>{" "}
                                    {log.operationDescription}
                                  </p>
                                  {log.playerInput && (
                                    <p className="mt-2">
                                      <strong>Player Input:</strong>{" "}
                                      {log.playerInput}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Error Details Section */}
                              <div className="border-l-2 border-red-500 pl-3">
                                <p className="font-bold text-red-600 dark:text-red-400">
                                  ❌ Error Details
                                </p>
                                <div className="mt-1 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                  <p>
                                    <strong>Type:</strong>{" "}
                                    {log.error?.name || "Error"}
                                  </p>
                                  <p className="mt-2">
                                    <strong>Message:</strong>
                                  </p>
                                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                                    {log.error?.message}
                                  </p>
                                  {log.error?.stack && (
                                    <>
                                      <p className="mt-2">
                                        <strong>Stack Trace:</strong>
                                      </p>
                                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                                        {log.error.stack}
                                      </pre>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* System Response Section */}
                              {log.systemResponse && (
                                <div className="border-l-2 border-green-500 pl-3">
                                  <p className="font-bold text-green-600 dark:text-green-400">
                                    💬 System Response (to Player)
                                  </p>
                                  <p className="mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded whitespace-pre-wrap">
                                    {log.systemResponse}
                                  </p>
                                </div>
                              )}

                              {/* Context Section */}
                              {log.context && (
                                <div className="border-l-2 border-blue-500 pl-3">
                                  <p className="font-bold text-blue-600 dark:text-blue-400">
                                    📍 Context
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    <p>
                                      <strong>User ID:</strong>{" "}
                                      {log.context.userId}
                                    </p>
                                    <p>
                                      <strong>Game ID:</strong>{" "}
                                      {log.context.gameId}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Metadata Section */}
                              <div className="border-l-2 border-gray-500 pl-3">
                                <p className="font-bold">📊 Metadata</p>
                                <p>
                                  <strong>Error ID:</strong> {log.errorId}
                                </p>
                                <p>
                                  <strong>Timestamp:</strong>{" "}
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    }

                    // Command Log
                    if (isCommandLog) {
                      return (
                        <AccordionItem
                          key={log.commandId || index}
                          value={`command-${index}`}
                        >
                          <AccordionTrigger className="text-xs py-2">
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                                Turn {log.context?.turnNumber || index + 1}
                              </span>
                              <span className="flex-1 text-left truncate">
                                "{log.input?.raw || "No input"}"
                              </span>
                              {log.wasSuccessful ? (
                                <span className="text-green-600 dark:text-green-400">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  ✗
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-xs">
                              {/* Player Input Section */}
                              <div className="border-l-2 border-blue-500 pl-3">
                                <p className="font-bold text-blue-600 dark:text-blue-400">
                                  📥 Player Input
                                </p>
                                <p className="mt-1">
                                  <strong>Raw:</strong> {log.input?.raw}
                                </p>
                                {log.input?.preprocessed &&
                                  log.input.preprocessed !== log.input.raw && (
                                    <p>
                                      <strong>Preprocessed:</strong>{" "}
                                      {log.input.preprocessed}
                                    </p>
                                  )}
                              </div>

                              {/* AI Interpretation Section */}
                              {log.aiInterpretation && (
                                <div className="border-l-2 border-purple-500 pl-3">
                                  <p className="font-bold text-purple-600 dark:text-purple-400">
                                    🤖 AI Interpretation
                                  </p>

                                  {/* Primary AI */}
                                  <div className="mt-1 bg-muted/50 p-2 rounded">
                                    <p className="font-semibold">
                                      Primary AI (
                                      {log.aiInterpretation.primaryAI?.model})
                                    </p>
                                    <p>
                                      <strong>Confidence:</strong>{" "}
                                      {(
                                        (log.aiInterpretation.primaryAI
                                          ?.confidence || 0) * 100
                                      ).toFixed(1)}
                                      %
                                    </p>
                                    <p>
                                      <strong>Command:</strong>{" "}
                                      {
                                        log.aiInterpretation.primaryAI
                                          ?.commandToExecute
                                      }
                                    </p>
                                    {log.aiInterpretation.primaryAI
                                      ?.reasoning && (
                                      <p className="mt-1 text-muted-foreground italic">
                                        {
                                          log.aiInterpretation.primaryAI
                                            .reasoning
                                        }
                                      </p>
                                    )}
                                    <p className="text-muted-foreground text-right mt-1">
                                      {
                                        log.aiInterpretation.primaryAI
                                          ?.latencyMs
                                      }
                                      ms • $
                                      {(
                                        log.aiInterpretation.primaryAI
                                          ?.costUSD || 0
                                      ).toFixed(6)}
                                    </p>
                                  </div>

                                  {/* Safety AI (if triggered) */}
                                  {log.aiInterpretation.safetyAI && (
                                    <div className="mt-1 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                                      <p className="font-semibold">
                                        Safety AI (
                                        {log.aiInterpretation.safetyAI.model})
                                      </p>
                                      <p>
                                        <strong>Confidence:</strong>{" "}
                                        {(
                                          (log.aiInterpretation.safetyAI
                                            .confidence || 0) * 100
                                        ).toFixed(1)}
                                        %
                                      </p>
                                      <p>
                                        <strong>Command:</strong>{" "}
                                        {
                                          log.aiInterpretation.safetyAI
                                            .commandToExecute
                                        }
                                      </p>
                                      <p className="text-muted-foreground text-right mt-1">
                                        $
                                        {(
                                          log.aiInterpretation.safetyAI
                                            .costUSD || 0
                                        ).toFixed(6)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Final Decision */}
                                  <div className="mt-1">
                                    <p>
                                      <strong>Final Decision:</strong>{" "}
                                      {
                                        log.aiInterpretation.finalDecision
                                          ?.source
                                      }
                                      (
                                      {(
                                        (log.aiInterpretation.finalDecision
                                          ?.confidence || 0) * 100
                                      ).toFixed(1)}
                                      %)
                                    </p>
                                    <p>
                                      <strong>Total AI Calls:</strong>{" "}
                                      {log.aiInterpretation.totalAICalls}
                                    </p>
                                    <p>
                                      <strong>Total Cost:</strong> $
                                      {(
                                        log.aiInterpretation.totalCostUSD || 0
                                      ).toFixed(6)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Execution Section */}
                              <div className="border-l-2 border-green-500 pl-3">
                                <p className="font-bold text-green-600 dark:text-green-400">
                                  ⚙️ Execution
                                </p>
                                <p>
                                  <strong>Verb:</strong>{" "}
                                  {log.execution?.handler}
                                </p>
                                {log.execution?.targetEntity && (
                                  <p>
                                    <strong>Target:</strong>{" "}
                                    {log.execution.targetEntity}
                                  </p>
                                )}
                                <p>
                                  <strong>Effects:</strong>{" "}
                                  {log.execution?.effectsApplied} (
                                  {log.execution?.effectTypes?.join(", ")})
                                </p>
                                <p>
                                  <strong>Success:</strong>{" "}
                                  {log.execution?.success ? "✓ Yes" : "✗ No"}
                                </p>
                                {log.execution?.errorMessage && (
                                  <p className="text-red-600 dark:text-red-400">
                                    <strong>Error:</strong>{" "}
                                    {log.execution.errorMessage}
                                  </p>
                                )}
                              </div>

                              {/* UI Messages Section */}
                              {log.uiMessages && log.uiMessages.length > 0 && (
                                <div className="border-l-2 border-gray-500 pl-3">
                                  <p className="font-bold">
                                    💬 UI Messages ({log.uiMessages.length})
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    {log.uiMessages.map(
                                      (msg: any, msgIdx: number) => (
                                        <div
                                          key={msgIdx}
                                          className="bg-muted/30 p-2 rounded"
                                        >
                                          <p className="font-semibold">
                                            {msg.senderName}
                                          </p>
                                          <p className="whitespace-pre-wrap">
                                            {msg.content}
                                          </p>
                                          {msg.media && (
                                            <p className="text-muted-foreground">
                                              📎{" "}
                                              {msg.media.hint ||
                                                "Media attached"}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Performance Metrics */}
                              <div className="border-l-2 border-yellow-500 pl-3">
                                <p className="font-bold text-yellow-600 dark:text-yellow-400">
                                  ⏱️ Performance
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <p>
                                    <strong>Preprocessing:</strong>{" "}
                                    {log.performance?.preprocessingMs}ms
                                  </p>
                                  <p>
                                    <strong>AI:</strong>{" "}
                                    {log.performance?.aiInterpretationMs}ms
                                  </p>
                                  <p>
                                    <strong>Execution:</strong>{" "}
                                    {log.performance?.executionMs}ms
                                  </p>
                                  <p>
                                    <strong>Total:</strong>{" "}
                                    {log.performance?.totalMs}ms
                                  </p>
                                </div>
                              </div>

                              {/* Token Usage */}
                              {log.tokens && (
                                <div className="text-muted-foreground text-right">
                                  Tokens: {log.tokens.input} in /{" "}
                                  {log.tokens.output} out / {log.tokens.total}{" "}
                                  total
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    } else {
                      // Regular message (legacy format)
                      return (
                        <AccordionItem
                          key={log.id || index}
                          value={`message-${index}`}
                        >
                          <AccordionTrigger className="text-xs py-2">
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-semibold">
                                {log.senderName}
                              </span>
                              <span className="flex-1 text-left truncate text-muted-foreground">
                                {log.content?.substring(0, 60)}
                                {log.content?.length > 60 ? "..." : ""}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="text-xs space-y-2">
                              <p>
                                <strong>Sender:</strong> {log.senderName} (
                                {log.sender})
                              </p>
                              <p className="whitespace-pre-wrap">
                                {log.content}
                              </p>
                              {log.media && (
                                <div className="bg-muted/50 p-2 rounded">
                                  <p>
                                    <strong>Media Type:</strong> {log.type}
                                  </p>
                                  <p>
                                    <strong>Hint:</strong> {log.media.hint}
                                  </p>
                                  {log.media.url && (
                                    <p>
                                      <strong>URL:</strong>{" "}
                                      <a
                                        href={log.media.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        {log.media.url}
                                      </a>
                                    </p>
                                  )}
                                </div>
                              )}
                              {log.usage && (
                                <p className="text-muted-foreground text-right">
                                  Tokens: {log.usage.totalTokens} (~$
                                  {calculateCostForUsage(log.usage).toFixed(6)})
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    }
                  })}
                </Accordion>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export function UsersTab({
  users,
  games,
  isLoading,
  onRefresh,
}: {
  users: User[];
  games: Game[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleDeleteUser = (userToDelete: User) => {
    startDeleteTransition(async () => {
      try {
        await deleteUser(userToDelete.id, userToDelete.purchasedGames);
        toast({
          title: "User Deleted",
          description: `${userToDelete.username} (${userToDelete.id}) has been successfully deleted.`,
        });
        if (selectedUser?.id === userToDelete.id) {
          setSelectedUser(null);
        }
        onRefresh(); // Refresh the user list
      } catch (error) {
        console.error("Delete user error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
          variant: "destructive",
          title: "Deletion Failed",
          description: errorMessage,
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            A list of all players. Select a user to see their game data.
          </CardDescription>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading || isDeleting}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (isLoading || isDeleting) && "animate-spin"
            )}
          />
          <span className="ml-2 hidden sm:inline">Update</span>
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-4">
          <Input
            placeholder="Search by phone number or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <LoaderCircle className="animate-spin h-8 w-8" />
            </div>
          ) : (
            <Card>
              <ScrollArea className="h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={cn(
                          "cursor-pointer",
                          selectedUser?.id === user.id && "bg-muted/80"
                        )}
                      >
                        <TableCell>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.id}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()} // Prevent row selection
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the user{" "}
                                  <span className="font-bold">
                                    {user.username} ({user.id})
                                  </span>{" "}
                                  and all of their associated data (game state,
                                  logs).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </div>
        <div className="md:col-span-2">
          {selectedUser ? (
            <PlayerDetails user={selectedUser} games={games} />
          ) : (
            <div className="flex items-center justify-center h-full rounded-lg border border-dashed text-muted-foreground">
              <p>Select a user from the list to view their data.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
