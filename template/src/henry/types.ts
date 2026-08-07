export type HenryInvestorProps = {
  company: string;
  oneLinePosition: string;
  problem: string;
  thesisPoints: [string, string, string];
  risks: [string, string];
  nextDiligence: string;
  slideImages: string[];
};

export type HenrySceneId = 'opening' | 'problem' | 'thesis' | 'verdict';

export type HenryTimelineEntry = {
  id: HenrySceneId;
  from: number;
  duration: number;
};
