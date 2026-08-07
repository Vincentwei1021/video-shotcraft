import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import timelineJson from './timeline.json';
import type {HenryInvestorProps, HenryTimelineEntry} from './types';
import {Opening} from './scenes/Opening';
import {Problem} from './scenes/Problem';
import {Thesis} from './scenes/Thesis';
import {Verdict} from './scenes/Verdict';

const timeline = timelineJson as HenryTimelineEntry[];

const imageAt = (slideImages: string[], index: number) =>
  staticFile(slideImages[index] ?? slideImages[slideImages.length - 1] ?? slideImages[0]);

export const HenryInvestorMvp: React.FC<HenryInvestorProps> = (props) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#071019'}}>
      {timeline.map((scene) => {
        const content = (() => {
          switch (scene.id) {
            case 'opening':
              return (
                <Opening
                  company={props.company}
                  oneLinePosition={props.oneLinePosition}
                  slideImage={imageAt(props.slideImages, 0)}
                  durationInFrames={scene.duration}
                />
              );
            case 'problem':
              return (
                <Problem
                  problem={props.problem}
                  slideImage={imageAt(props.slideImages, 2)}
                  durationInFrames={scene.duration}
                />
              );
            case 'thesis':
              return (
                <Thesis
                  thesisPoints={props.thesisPoints}
                  slideImage={imageAt(props.slideImages, 5)}
                  durationInFrames={scene.duration}
                />
              );
            case 'verdict':
              return (
                <Verdict
                  oneLinePosition={props.oneLinePosition}
                  risks={props.risks}
                  nextDiligence={props.nextDiligence}
                  slideImage={imageAt(props.slideImages, 8)}
                  durationInFrames={scene.duration}
                />
              );
          }
        })();

        return (
          <Sequence key={scene.id} name={scene.id} from={scene.from} durationInFrames={scene.duration} premountFor={30}>
            {content}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
