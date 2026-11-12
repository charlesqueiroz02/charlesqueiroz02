/** Velocidades médias usadas nas estimativas de tempo economizado */
export const TYPING_WPM = 38;
export const SPEAKING_WPM = 140;

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** Segundos economizados ditando em vez de digitar */
export const timeSavedSeconds = (words: number) =>
  Math.max(0, Math.round((words / TYPING_WPM) * 60) - Math.round((words / SPEAKING_WPM) * 60));
