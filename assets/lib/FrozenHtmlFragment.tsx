import React from 'react';

export type FrozenHtmlFragmentProps = {
  html: string;
  width: number;
  height: number;
  fontCss?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * A-route wrapper for a browser-captured, script-free DOM subtree.
 * The forwarded ref points at the fragment stage so the parent can query
 * rows/cards and drive all mutations as pure functions of the Remotion frame.
 */
export const FrozenHtmlFragment = React.forwardRef<
  HTMLDivElement,
  FrozenHtmlFragmentProps
>(({html, width, height, fontCss = '', className, style}, ref) => {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        isolation: 'isolate',
        ...style,
      }}
    >
      {fontCss ? <style>{fontCss}</style> : null}
      <div
        ref={ref}
        data-html-material="fragment"
        style={{position: 'absolute', inset: 0}}
        dangerouslySetInnerHTML={{__html: html}}
      />
    </div>
  );
});

FrozenHtmlFragment.displayName = 'FrozenHtmlFragment';
