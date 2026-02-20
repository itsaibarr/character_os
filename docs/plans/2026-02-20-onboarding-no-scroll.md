# Onboarding No-Scroll Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every onboarding step fit within the viewport without page scrolling by compacting the layout and auto-advancing single-choice steps.

**Architecture:** Single file change to `OnboardingForm.tsx`. Two concerns: (1) shrink padding/font/card sizes globally, (2) add auto-advance by calling `setCurrentStep` directly inside single-select click handlers — bypasses the Next button entirely for those steps.

**Tech Stack:** React (client component), Tailwind CSS, Framer Motion, Next.js App Router.

---

### Task 1: Compact the layout and add auto-advance

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx` (full file replacement)

**Step 1: Replace the file with the compacted + auto-advance version**

Replace the entire contents of `src/app/onboarding/OnboardingForm.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Rocket, Dumbbell, Brain, Focus, MessageCircle, PenTool, User, Laptop } from "lucide-react";
import { completeOnboarding } from "../actions/onboarding";
import clsx from "clsx";

const steps = [
  { id: "focusAreas", title: "Where do you want to improve?", subtitle: "Select all that apply." },
  { id: "archetype", title: "Choose your path.", subtitle: "How do you see yourself evolving?" },
  { id: "frictionProfile", title: "What holds you back?", subtitle: "Select your biggest obstacle." },
  { id: "dailyCapacity", title: "Realistic Focus Time", subtitle: "How many deep work hours can you commit daily?" },
  { id: "feedbackPreference", title: "Feedback Style", subtitle: "How should the system motivate you?" },
  { id: "trackingTools", title: "Your Current Stack", subtitle: "What do you currently use (or have tried)?" },
  { id: "acquisitionSource", title: "How did you find us?", subtitle: "Select one." },
  { id: "triggerReason", title: "Why today?", subtitle: "What specifically made you look for a tool like this now?" },
  { id: "mainGoal", title: "The Finish Line", subtitle: "One big goal for the next 3 months?" },
];

const focusOptions = [
  { id: "Health", icon: Dumbbell, label: "Health & Fitness" },
  { id: "Academic", icon: Brain, label: "Academic / Learning" },
  { id: "Startup", icon: Rocket, label: "Startup / Business" },
  { id: "Career", icon: Laptop, label: "Career Growth" },
  { id: "Focus", icon: Focus, label: "Deep Focus" },
  { id: "Communication", icon: MessageCircle, label: "Social Skills" },
  { id: "Personal Projects", icon: PenTool, label: "Creative Projects" },
];

const archetypeOptions = [
  { id: "Builder", icon: Laptop, label: "Builder" },
  { id: "Scholar", icon: Brain, label: "Scholar" },
  { id: "Operator", icon: Focus, label: "Operator" },
  { id: "Athlete", icon: Dumbbell, label: "Athlete" },
  { id: "Leader", icon: User, label: "Leader" },
];

const frictionOptions = [
  "I lose motivation quickly.",
  "I don't see tangible progress.",
  "I spend too much time organizing.",
  "I overplan and underexecute.",
  "I get distracted easily.",
];

const capacityOptions = ["Less than 1 hour", "1-2 hours", "3-4 hours", "5+ hours"];
const feedbackOptions = [
  "Visible stats & XP gains",
  "Daily streaks & consistency",
  "Unlocking achievements",
  "Short, punchy reminders",
  "Competitive leaderboards",
];

const stackOptions = ["Notion", "Linear", "Obsidian", "Todoist", "Paper/Analog", "Google Calendar", "None"];
const acquisitionOptions = ["Twitter / X", "Friend / Referral", "Search Engine", "Blog / Article", "Other"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    focusAreas: [] as string[],
    archetype: "",
    frictionProfile: "",
    dailyCapacity: "",
    feedbackPreference: "",
    trackingTools: [] as string[],
    acquisitionSource: "",
    triggerReason: "",
    mainGoal: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding(formData);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  // Used by single-select steps to set state and immediately advance
  const selectAndAdvance = (update: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...update }));
    setCurrentStep((prev) => prev + 1);
  };

  const toggleSelection = (field: "focusAreas" | "trackingTools", value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((item) => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const isStepValid = () => {
    const { focusAreas, archetype, frictionProfile, dailyCapacity, feedbackPreference, trackingTools, acquisitionSource, triggerReason, mainGoal } = formData;
    switch (currentStep) {
      case 0: return focusAreas.length > 0;
      case 1: return !!archetype;
      case 2: return !!frictionProfile;
      case 3: return !!dailyCapacity;
      case 4: return !!feedbackPreference;
      case 5: return trackingTools.length > 0;
      case 6: return !!acquisitionSource;
      case 7: return triggerReason.length > 5;
      case 8: return mainGoal.length > 5;
      default: return false;
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full px-6 py-6">
      <div className="mb-6">
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary shadow-[0_0_15px_rgba(0,86,210,0.4)]"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{steps[currentStep].title}</h1>
            <p className="text-slate-500 text-base font-medium">{steps[currentStep].subtitle}</p>
          </div>

          <div>
            {currentStep === 0 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {focusOptions.map((option) => (
                  <motion.button
                    key={option.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleSelection("focusAreas", option.id)}
                    className={clsx(
                      "p-3 rounded-xl border text-left flex items-center space-x-3 transition-all",
                      formData.focusAreas.includes(option.id)
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <option.icon className={clsx("w-5 h-5", formData.focusAreas.includes(option.id) ? "text-white" : "text-primary")} />
                    <span className="font-semibold">{option.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
                {archetypeOptions.map((option) => (
                  <motion.button
                    key={option.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectAndAdvance({ archetype: option.id })}
                    className={clsx(
                      "p-3 rounded-xl border text-left flex items-center space-x-3 transition-all",
                      formData.archetype === option.id
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <div className={clsx("p-2 rounded-lg transition-colors", formData.archetype === option.id ? "bg-white/20" : "bg-secondary")}>
                      <option.icon className={clsx("w-5 h-5", formData.archetype === option.id ? "text-white" : "text-primary")} />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider">{option.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                {frictionOptions.map((option) => (
                  <motion.button
                    key={option}
                    variants={itemVariants}
                    onClick={() => selectAndAdvance({ frictionProfile: option })}
                    className={clsx(
                      "w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all",
                      formData.frictionProfile === option
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <span className="font-semibold">{option}</span>
                    {formData.frictionProfile === option && <Check className="w-5 h-5" />}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-2">
                {capacityOptions.map((option) => (
                  <motion.button
                    key={option}
                    variants={itemVariants}
                    onClick={() => selectAndAdvance({ dailyCapacity: option })}
                    className={clsx(
                      "p-3 rounded-xl border text-center transition-all",
                      formData.dailyCapacity === option
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <span className="font-semibold">{option}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-2">
                {feedbackOptions.map((option) => (
                  <motion.button
                    key={option}
                    variants={itemVariants}
                    onClick={() => selectAndAdvance({ feedbackPreference: option })}
                    className={clsx(
                      "p-3 rounded-xl border text-left transition-all",
                      formData.feedbackPreference === option
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <span className="font-semibold">{option}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stackOptions.map((option) => (
                  <motion.button
                    key={option}
                    variants={itemVariants}
                    onClick={() => toggleSelection("trackingTools", option)}
                    className={clsx(
                      "p-3 rounded-xl border text-center transition-all",
                      formData.trackingTools.includes(option)
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <span className="font-semibold">{option}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 6 && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-2">
                {acquisitionOptions.map((option) => (
                  <motion.button
                    key={option}
                    variants={itemVariants}
                    onClick={() => selectAndAdvance({ acquisitionSource: option })}
                    className={clsx(
                      "p-3 rounded-xl border text-left transition-all",
                      formData.acquisitionSource === option
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <span className="font-semibold">{option}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {currentStep === 7 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <textarea
                  autoFocus
                  rows={4}
                  value={formData.triggerReason}
                  onChange={(e) => setFormData({ ...formData, triggerReason: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-base font-medium focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-primary outline-none transition-all resize-none shadow-sm"
                  placeholder="e.g. I realized my previous system was too bloated and I needed something cleaner..."
                />
                <p className="text-slate-400 text-sm">Min. 6 characters required to continue.</p>
              </motion.div>
            )}

            {currentStep === 8 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <textarea
                  autoFocus
                  rows={4}
                  value={formData.mainGoal}
                  onChange={(e) => setFormData({ ...formData, mainGoal: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-base font-medium focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-primary outline-none transition-all resize-none shadow-sm"
                  placeholder="e.g. Build my first profitable SaaS application while staying healthy."
                />
                <p className="text-slate-400 text-sm">Be specific. This defines your character path.</p>
              </motion.div>
            )}
          </div>

          <div className="pt-6 flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              className={clsx("text-slate-400 font-bold hover:text-slate-600 transition-colors", currentStep === 0 && "invisible")}
            >
              Back
            </button>
            {/* Next button hidden for auto-advance steps (1,2,3,4,6) — they advance on selection */}
            {![1, 2, 3, 4, 6].includes(currentStep) && (
              <motion.button
                whileHover={isStepValid() && !isSubmitting ? { scale: 1.05, x: 5 } : {}}
                whileTap={isStepValid() && !isSubmitting ? { scale: 0.95 } : {}}
                onClick={handleNext}
                disabled={!isStepValid() || isSubmitting}
                className={clsx(
                  "group flex items-center space-x-3 px-10 py-4 rounded-full font-bold transition-all shadow-xl",
                  isStepValid() && !isSubmitting
                    ? "bg-primary text-white hover:bg-primary-hover shadow-primary/20"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                <span className="text-base">{currentStep === steps.length - 1 ? (isSubmitting ? "Awakening..." : "Initialize Profile") : "Next Phase"}</span>
                {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Visual check — open the dev server and walk through each step**

Run: `npm run dev`

Check each step fits without scrolling on a 1080px screen:
- Step 1 (Focus Areas): 7 options in 2-col grid ✓
- Step 2 (Archetype): 5 options in 2-col grid, no descriptions ✓ — auto-advances on click
- Step 3 (Friction): 5 compact cards ✓ — auto-advances on click
- Step 4 (Daily Capacity): 4 cards ✓ — auto-advances on click
- Step 5 (Feedback): 5 cards ✓ — auto-advances on click
- Step 6 (Tracking Tools): 7 options in 2-col grid ✓
- Step 7 (Acquisition): 5 options ✓ — auto-advances on click
- Step 8 (Why today): textarea ✓
- Step 9 (Main Goal): textarea ✓

**Step 4: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx
git commit -m "feat: compact onboarding layout and auto-advance single-select steps"
```
