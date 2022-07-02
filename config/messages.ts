export interface Messages {
  okay: string;
  none: string;
  shorthelp: string;
}

export const messages: Record<string, Messages> = {
  "en.who": {
    "okay": "My :title is :mymaster, :permitted",
    "none": "I have no :title :~~~~~~~~~(",
    "shorthelp": "Who is the current :title"
  }
}
