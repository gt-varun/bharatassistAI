export { OnboardingPage } from './OnboardingPage';
export { OnboardingGate } from './OnboardingGate';
export { OnboardingChoicePage } from './OnboardingChoicePage';
export { AiOnboardingPage } from './AiOnboardingPage';
export { AiOnboardingPlaceholder } from './AiOnboardingPlaceholder';
export {
  useOnboarding,
  markOnboardingSkipped,
  wasOnboardingSkipped,
  ONBOARDING_SKIPPED_KEY
} from './useOnboarding';
export { ONBOARDING_STEPS, matchSpokenChoice, parseSpokenNumber } from './questions';
export type { OnboardingStep, Choice } from './questions';
