export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  header: string;
  accent: string;
  accentContrast: string;
  button: string;
  buttonText: string;
  progress: string;
  placeholder: string;
}

export interface StoredTheme {
  id: string;
  custom?: ThemeTokens;
}

