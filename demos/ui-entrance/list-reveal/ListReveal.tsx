// list-reveal — List Reveal 菜单逐项找位（motion-lab 定稿转原生 Remotion）
// 垂直菜单列表项依次 scale 找位入场（outBack 轻微过冲），同时整个列表容器
// 全程线性缓慢上移——"整体漂移"与"逐项入场"两层运动分离叠加。
// 设计坐标 480×270（DesignStage 等比放大，raster=zoom 让字形按成片分辨率栅格化），参数表数值以此坐标系标定。
// 质感层（改版）：列表收紧到 ~195px 高（原 255px 顶满画面、漂移后首项出画），留足安全边；
// 条目换成深石墨面 + 发丝线 + 顶部受光沿 + 两层软阴影，彩虹色块换成单色线性图标，
// 仅 Dashboard 用唯一强调色表示当前项，右侧补快捷键 / 未读数；入场时条目带 1.6px→0 的
// 对焦模糊，图标比条目晚 2f 落定（跟随）；暗场柔光底 + 暗角 + 颗粒替代纯黑平铺。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, FONT, Grain } from '../../_fixtures/Polish';

export const LIST_REVEAL_DURATION = 108; // 3600ms @30fps

const LABELS = ['Dashboard', 'Projects', 'Analytics', 'Messages', 'Settings', 'Sign out'];
const KEYS = ['⌘1', '⌘2', '⌘3', '', '⌘,', ''];
const ACCENT = '#7b83f0'; // 暗场里提亮一档的靛蓝（与 fixture accent 同色相）
const DUR = LIST_REVEAL_DURATION;

// 单色线性图标（16×16 视框，描边 1.5）
const Icon: React.FC<{ i: number; color: string }> = ({ i, color }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={10} height={10} viewBox="0 0 16 16">
      {i === 0 && (<><rect x={2} y={2} width={5} height={6} rx={1.2} {...p} /><rect x={9} y={2} width={5} height={4} rx={1.2} {...p} /><rect x={2} y={10} width={5} height={4} rx={1.2} {...p} /><rect x={9} y={8} width={5} height={6} rx={1.2} {...p} /></>)}
      {i === 1 && (<path d="M2 5 a1.5 1.5 0 0 1 1.5-1.5 h3 l1.5 1.8 h4.5 a1.5 1.5 0 0 1 1.5 1.5 v5.2 a1.5 1.5 0 0 1-1.5 1.5 h-9 a1.5 1.5 0 0 1-1.5-1.5 Z" {...p} />)}
      {i === 2 && (<><path d="M2.5 13.5 h11" {...p} /><path d="M4.5 11 v-3" {...p} /><path d="M8 11 v-6.5" {...p} /><path d="M11.5 11 v-4.5" {...p} /></>)}
      {i === 3 && (<path d="M2.5 4 a1.5 1.5 0 0 1 1.5-1.5 h8 a1.5 1.5 0 0 1 1.5 1.5 v5.5 a1.5 1.5 0 0 1-1.5 1.5 h-5 l-3 2.5 v-2.5 h-0 a1.5 1.5 0 0 1-1.5-1.5 Z" {...p} />)}
      {i === 4 && (<><circle cx={8} cy={8} r={2.2} {...p} /><path d="M8 1.8 v1.8 M8 12.4 v1.8 M1.8 8 h1.8 M12.4 8 h1.8 M3.6 3.6 l1.3 1.3 M11.1 11.1 l1.3 1.3 M3.6 12.4 l1.3-1.3 M11.1 4.9 l1.3-1.3" {...p} /></>)}
      {i === 5 && (<><path d="M9.5 2.5 h2.5 a1.5 1.5 0 0 1 1.5 1.5 v8 a1.5 1.5 0 0 1-1.5 1.5 h-2.5" {...p} /><path d="M7 5 l-3 3 l3 3 M4 8 h7" {...p} /></>)}
    </svg>
  );
};

export const ListReveal: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0b0c12" raster="zoom">
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.3 }} accent="#5b63d3" grain={0} vignette={0.55} />
      {/* 居中容器：flex 撑起列表垂直水平居中 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 整体漂移层：全程线性缓慢上移 */}
        <div
          style={{
            position: 'relative',
            width: 188,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            transform: `translateY(${lerp(t, 16, -16)}px)`,
          }}
        >
          {LABELS.map((s, i) => {
            // 逐项入场：outBack 轻微过冲找位
            const t0 = 0.06 + i * 0.09;
            const p = seg(t, t0, t0 + 0.24, E.outBack);
            const pc = Math.max(0, Math.min(1, p));
            // 图标晚 2f 起步（跟随），同一条 outBack
            const pi = seg(t, t0 + 2 / (DUR - 1), t0 + 2 / (DUR - 1) + 0.24, E.outBack);
            const active = i === 0;
            const last = i === LABELS.length - 1;
            const lin = Math.min(1, Math.max(0, (t - t0) / 0.24)); // 线性进度：对焦模糊用
            return (
              <React.Fragment key={i}>
                {/* Sign out 前一道分隔发丝线，跟着该项一起显现 */}
                {last && (
                  <div style={{ height: 0.5, margin: '1px 8px 1px', background: 'rgba(255,255,255,0.08)', opacity: Math.min(1, pc * 2.2) }} />
                )}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    height: 26,
                    padding: '0 9px 0 8px',
                    boxSizing: 'border-box',
                    borderRadius: 8,
                    background: active
                      ? 'linear-gradient(180deg, rgba(123,131,240,0.20) 0%, rgba(123,131,240,0.12) 100%), #171926'
                      : 'linear-gradient(180deg, #191b25 0%, #14161e 100%)',
                    boxShadow: [
                      `inset 0 0 0 0.25px ${active ? 'rgba(150,158,255,0.42)' : 'rgba(255,255,255,0.09)'}`,
                      'inset 0 0.5px 0 rgba(255,255,255,0.07)',
                      '0 0.5px 1px rgba(0,0,0,0.45)',
                      '0 6px 14px -6px rgba(0,0,0,0.6)',
                    ].join(', '),
                    opacity: Math.min(1, p * 2.2),
                    filter: lin < 1 ? `blur(${((1 - EASE_OUT(lin)) * 0.4).toFixed(3)}px)` : undefined,
                    transform: `scale(${0.78 + Math.max(0, p) * 0.22}) translateY(${lerp(Math.max(0, p), 14, 0)}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: active ? 'rgba(123,131,240,0.22)' : 'rgba(255,255,255,0.05)',
                      boxShadow: `inset 0 0 0 0.25px ${active ? 'rgba(150,158,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      transform: `scale(${(0.7 + Math.max(0, pi) * 0.3).toFixed(4)})`,
                      opacity: Math.min(1, Math.max(0, pi) * 2),
                    }}
                  >
                    <Icon i={i} color={active ? '#c9cdff' : last ? '#8a8fa3' : '#a7adc2'} />
                  </div>
                  <div
                    style={{
                      fontFamily: FONT.sans,
                      fontWeight: active ? 600 : 500,
                      fontSize: 12,
                      letterSpacing: '-0.01em',
                      lineHeight: 1,
                      color: active ? '#eef0ff' : last ? '#9095a8' : '#cfd4e4',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    {i === 3 ? (
                      // 未读数 badge
                      <div
                        style={{
                          minWidth: 14, height: 11, padding: '0 3.5px', boxSizing: 'border-box', borderRadius: 6,
                          background: ACCENT, color: '#fff', fontFamily: FONT.sans, fontSize: 7.5, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums',
                          boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.3)',
                        }}
                      >
                        3
                      </div>
                    ) : KEYS[i] ? (
                      <div style={{ fontFamily: FONT.mono, fontSize: 7.5, color: active ? 'rgba(220,224,255,0.7)' : 'rgba(200,206,226,0.42)', letterSpacing: '0.02em' }}>
                        {KEYS[i]}
                      </div>
                    ) : null}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <Grain opacity={0.07} scale={0.25} blend="soft-light" />
    </DesignStage>
  );
};

// 对焦模糊的收敛曲线（模糊在前 40% 行程内基本消掉）
const EASE_OUT = (x: number) => 1 - Math.pow(1 - x, 3);
