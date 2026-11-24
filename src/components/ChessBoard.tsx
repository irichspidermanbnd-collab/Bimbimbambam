import React, { useMemo, useState, useEffect } from 'react';
import {
  ChessState,
  coordsToSquare,
  findKing,
  getLegalMoves,
  isKingInCheck,
  Move,
  Square,
  squareToCoords,
} from '../lib/chess';
import { BoardArrow, SquareHighlight } from '../data/chessTips';
import { ChessPiece } from './ChessPiece';

interface ChessBoardProps {
  state: ChessState;
  orientation?: 'w' | 'b';
  interactive?: boolean;
  onMove?: (move: Move) => void;
  lastMove?: { from: Square; to: Square } | null;
  highlights?: SquareHighlight[];
  arrows?: BoardArrow[];
  showCoordinates?: boolean;
  showLegalHints?: boolean;
  sizeClass?: string;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function getSquareCenter(sq: Square, orientation: 'w' | 'b'): { x: number; y: number } {
  const { r, c } = squareToCoords(sq);
  const displayCol = orientation === 'w' ? c : 7 - c;
  const displayRow = orientation === 'w' ? r : 7 - r;
  return {
    x: displayCol * 100 + 50,
    y: displayRow * 100 + 50,
  };
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  state,
  orientation = 'w',
  interactive = true,
  onMove,
  lastMove = null,
  highlights = [],
  arrows = [],
  showCoordinates = true,
  showLegalHints = true,
  sizeClass = 'w-full max-w-[540px]',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  // Clear selection whenever position changes
  useEffect(() => {
    setSelectedSquare(null);
  }, [state]);

  const legalMovesForSelected = useMemo(() => {
    if (!interactive || !selectedSquare) return [];
    return getLegalMoves(state, selectedSquare);
  }, [interactive, selectedSquare, state]);

  const legalTargetMap = useMemo(() => {
    const map = new Map<Square, Move>();
    for (const m of legalMovesForSelected) {
      // Prefer Queen promotion by default if multiple promotions exist on same target square
      const existing = map.get(m.to);
      if (!existing || m.promotion === 'q') {
        map.set(m.to, m);
      }
    }
    return map;
  }, [legalMovesForSelected]);

  const inCheckKingSquare = useMemo(() => {
    if (!isKingInCheck(state.board, state.turn)) return null;
    const kp = findKing(state.board, state.turn);
    return kp ? coordsToSquare(kp.r, kp.c) : null;
  }, [state]);

  const highlightMap = useMemo(() => {
    const map = new Map<Square, SquareHighlight['tone']>();
    for (const h of highlights) {
      map.set(h.square, h.tone);
    }
    return map;
  }, [highlights]);

  const handleSquareClick = (sq: Square) => {
    if (!interactive || !onMove) return;

    const targetMove = legalTargetMap.get(sq);
    if (targetMove) {
      onMove(targetMove);
      setSelectedSquare(null);
      return;
    }

    const { r, c } = squareToCoords(sq);
    const piece = state.board[r][c];
    if (piece && piece.color === state.turn) {
      setSelectedSquare((prev) => (prev === sq ? null : sq));
    } else {
      setSelectedSquare(null);
    }
  };

  const rowIndices = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const colIndices = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div
      className={`relative select-none aspect-square rounded-sm border border-[#D4CFC5] bg-[#EAE6DC] shadow-[0_10px_28px_-14px_rgba(24,24,27,0.22)] overflow-hidden ${sizeClass}`}
      role="grid"
      aria-label="Interactive chessboard"
    >
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {rowIndices.map((r, displayR) =>
          colIndices.map((c, displayC) => {
            const sq = coordsToSquare(r, c);
            const isLight = (r + c) % 2 === 0;
            const piece = state.board[r][c];
            const isSelected = selectedSquare === sq;
            const isLast = lastMove?.from === sq || lastMove?.to === sq;
            const isLegalTarget = legalTargetMap.has(sq);
            const isKingCheck = inCheckKingSquare === sq;
            const customTone = highlightMap.get(sq);

            const baseBg = isLight ? 'bg-[#F0ECE1]' : 'bg-[#6F877A]';

            let overlayClass = '';
            if (isSelected) {
              overlayClass = 'bg-[#B45309]/30';
            } else if (isLast) {
              overlayClass = isLight ? 'bg-[#D9B96A]/35' : 'bg-[#D9B96A]/30';
            }

            const showFileLabel = showCoordinates && displayR === 7;
            const showRankLabel = showCoordinates && displayC === 0;
            const coordTextColor = isLight ? 'text-[#5A7064]' : 'text-[#ECE8DD]';

            return (
              <button
                key={sq}
                type="button"
                disabled={!interactive}
                onClick={() => handleSquareClick(sq)}
                aria-label={`Square ${sq}${piece ? `, ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
                className={`relative flex items-center justify-center w-full h-full focus-visible:z-20 transition-colors duration-100 ${baseBg} ${
                  interactive ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {overlayClass && <span className={`absolute inset-0 pointer-events-none ${overlayClass}`} />}

                {customTone === 'primary' && (
                  <span className="absolute inset-0 pointer-events-none bg-[#1B4D3E]/25 ring-2 ring-inset ring-[#1B4D3E]/55" />
                )}
                {customTone === 'amber' && (
                  <span className="absolute inset-0 pointer-events-none bg-[#B45309]/25 ring-2 ring-inset ring-[#B45309]/70" />
                )}
                {customTone === 'neutral' && (
                  <span className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-dashed ring-[#18181B]/45" />
                )}

                {isKingCheck && (
                  <span
                    className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(185,28,28,0.65)_0%,rgba(185,28,28,0)_75%)]"
                    aria-hidden="true"
                  />
                )}

                {/* Piece */}
                {piece && (
                  <div className="relative z-10 w-[84%] h-[84%] transition-transform duration-150 ease-out">
                    <ChessPiece piece={piece} />
                  </div>
                )}

                {/* Legal Move Indicators */}
                {showLegalHints && isLegalTarget && !piece && (
                  <span
                    className="relative z-20 w-[28%] h-[28%] rounded-full bg-[#18181B]/28 pointer-events-none"
                    aria-hidden="true"
                  />
                )}
                {showLegalHints && isLegalTarget && piece && (
                  <span
                    className="absolute inset-[6%] z-20 rounded-full border-[3px] border-[#18181B]/35 pointer-events-none"
                    aria-hidden="true"
                  />
                )}

                {/* Coordinates */}
                {showRankLabel && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-mono font-medium leading-none pointer-events-none tabular-nums ${coordTextColor}`}
                  >
                    {8 - r}
                  </span>
                )}
                {showFileLabel && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-mono font-medium leading-none pointer-events-none ${coordTextColor}`}
                  >
                    {FILES[c]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Pedagogical Arrows Overlay */}
      {arrows.length > 0 && (
        <svg
          viewBox="0 0 800 800"
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow-primary"
              markerWidth="5"
              markerHeight="5"
              refX="3.2"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 5 2.5, 0 5" fill="#1B4D3E" />
            </marker>
            <marker
              id="arrow-amber"
              markerWidth="5"
              markerHeight="5"
              refX="3.2"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 5 2.5, 0 5" fill="#B45309" />
            </marker>
          </defs>
          {arrows.map((arrow, idx) => {
            const p1 = getSquareCenter(arrow.from, orientation);
            const p2 = getSquareCenter(arrow.to, orientation);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const startX = p1.x + ux * 20;
            const startY = p1.y + uy * 20;
            const endX = p2.x - ux * 22;
            const endY = p2.y - uy * 22;
            const isAmber = arrow.tone === 'amber';
            return (
              <line
                key={`${arrow.from}-${arrow.to}-${idx}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={isAmber ? '#B45309' : '#1B4D3E'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeOpacity="0.72"
                markerEnd={isAmber ? 'url(#arrow-amber)' : 'url(#arrow-primary)'}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};
