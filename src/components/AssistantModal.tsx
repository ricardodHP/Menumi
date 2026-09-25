import { useState } from "react";
import { X, Bot, ArrowRight, RotateCcw, ShoppingBag, Check } from "lucide-react";
import type { Dish } from "@/data/restaurant";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  options: { label: string; value: string }[];
}

const questions: Question[] = [
  {
    id: "mood",
    text: "¿Qué se te antoja hoy?",
    options: [
      { label: "🥩 Algo con carne", value: "carne" },
      { label: "🥗 Algo ligero", value: "ligero" },
      { label: "🍲 Algo calientito", value: "calientito" },
      { label: "🎉 Sorpréndeme", value: "sorpresa" },
    ],
  },
  {
    id: "budget",
    text: "¿Cuál es tu presupuesto?",
    options: [
      { label: "💰 Económico (< $80)", value: "bajo" },
      { label: "💵 Moderado ($80-$130)", value: "medio" },
      { label: "💎 Sin límite", value: "alto" },
    ],
  },
  {
    id: "extra",
    text: "¿Quieres acompañar con algo?",
    options: [
      { label: "🍹 Una bebida", value: "bebida" },
      { label: "🍮 Un postre", value: "postre" },
      { label: "👌 Solo el platillo", value: "nada" },
    ],
  },
];

function getRecommendations(answers: Record<string, string>, allDishes: Dish[]): Dish[] {
  const { mood, budget, extra } = answers;

  const lc = (s: string) => (s ?? "").toLowerCase();

  const availableDishes = allDishes.filter((dish) => dish.isAvailable !== false);
  let candidates = [...availableDishes];

  // Filter by mood using tags + keywords
  if (mood === "carne") {
    candidates = candidates.filter((d) =>
      [...d.tags.map(lc), lc(d.name), lc(d.description)].some((s) =>
        /carne|res|pollo|cerdo|pastor|asad|premium/.test(s),
      ),
    );
  } else if (mood === "ligero") {
    candidates = candidates.filter((d) =>
      [...d.tags.map(lc), lc(d.name), lc(d.description)].some((s) =>
        /vegetar|ensalad|fresc|bebida|jugo|agua|ligero/.test(s),
      ),
    );
  } else if (mood === "calientito") {
    candidates = candidates.filter((d) =>
      [...d.tags.map(lc), lc(d.name), lc(d.description)].some((s) =>
        /sopa|caldo|pozole|guisad|pasta|caliente/.test(s),
      ),
    );
  }

  if (budget === "bajo") candidates = candidates.filter((d) => d.price < 80);
  else if (budget === "medio")
    candidates = candidates.filter((d) => d.price >= 80 && d.price <= 130);

  candidates.sort((a, b) => b.rating - a.rating);

  const main = candidates.length > 0 ? [candidates[0]] : [availableDishes[0]].filter(Boolean);

  // Companion picks based on extra
  const pickCompanion = (regex: RegExp) =>
    availableDishes
      .filter((d) =>
        [...d.tags.map(lc), lc(d.name), lc(d.description)].some((s) => regex.test(s)),
      )
      .sort((a, b) => b.rating - a.rating)[0];

  if (extra === "bebida") {
    const drink = pickCompanion(/bebida|jugo|agua|cocktail|margarita|refresco/);
    if (drink) main.push(drink);
  } else if (extra === "postre") {
    const dessert = pickCompanion(/postre|dulce|sweet|churro|flan|helado/);
    if (dessert) main.push(dessert);
  }

  return main;
}

interface Props {
  open: boolean;
  onClose: () => void;
  dishes: Dish[];
}

const AssistantModal = ({ open, onClose, dishes }: Props) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<Dish[] | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addItem } = useCart();

  const reset = () => {
    setStep(0);
    setAnswers({});
    setRecommendations(null);
    setAddedIds(new Set());
  };

  const handleAdd = (dish: Dish) => {
    if (dish.isAvailable === false) return;
    addItem(dish);
    setAddedIds((prev) => new Set(prev).add(dish.id));
    toast.success(`${dish.name} agregado al carrito`);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setRecommendations(getRecommendations(newAnswers, dishes));
    }
  };

  if (!open) return null;

  const currentQuestion = questions[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/40" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-background rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground text-sm">Asistente del Chef</span>
          </div>
          <button onClick={handleClose} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 min-h-[280px]">
          {!recommendations ? (
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <p className="text-foreground font-medium text-base">{currentQuestion.text}</p>

              <div className="grid gap-2">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-secondary transition-colors text-sm text-foreground flex items-center justify-between group"
                  >
                    {opt.label}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-foreground font-medium text-base">
                🎯 ¡Te recomiendo esto!
              </p>

              {recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay platillos disponibles para esta recomendación.
                </p>
              ) : recommendations.map((dish) => (
                <div key={dish.id} className="flex gap-3 p-3 rounded-xl bg-card border border-border">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">{dish.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{dish.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-primary">${dish.price}</span>
                      <button
                        onClick={() => handleAdd(dish)}
                        className={`flex items-center gap-1 text-xs font-medium transition-opacity ${
                          addedIds.has(dish.id) ? "text-muted-foreground" : "text-primary hover:opacity-80"
                        }`}
                      >
                        {addedIds.has(dish.id) ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Agregar más
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Agregar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Volver a preguntar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantModal;
