import { Composition } from 'remotion';
import { AiflMain, AIFL_TOTAL } from './aifl/Main';
import {HenryInvestorMvp} from './henry/HenryInvestorMvp';
import type {HenryInvestorProps} from './henry/types';
import henryExampleProps from '../private/props.example.json';

const henryDefaultProps = henryExampleProps as HenryInvestorProps;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="AiflPromo"
        component={AiflMain}
        durationInFrames={AIFL_TOTAL}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HenryInvestorMvp"
        component={HenryInvestorMvp}
        defaultProps={henryDefaultProps}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
