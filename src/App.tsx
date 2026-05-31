import { useMemo, useState } from 'react';
import './App.css';
import tables from './engine/lookupTables/importedPrecalculatedData';

const {blackPawnAttacks: blackPawnAttackTable, kingAttacks: kingLookupTable, knightAttacks: knightLookupTable, whitePawnAttacks: whitePawnAttackTable, rookMagicNumbers, rookRelevantBlockerMasks: rookRelevantBlockerMask, bishopRelevantBlockerMasks:bishopRelevantBlockerMask  } = tables;

console.log(rookMagicNumbers[0]);

const BitboardVisualizer: React.FC<{bitboard: bigint[]}> = ({bitboard}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

 const bitboardValues = useMemo(() => bitboard[selectedIndex].toString(2).padStart(64, '0').match(/.{1,8}/g)?.flatMap(row => row.split('').reverse()), [selectedIndex, bitboard]);
 const emptyBitboard = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (7 - r) * 8 + c)).flat();

  return (
    <div style={{display: 'flex', flex: 1, flexDirection: 'row', gap: 50, justifyContent: 'center'}}>
    
      <div key={'saddass'} style={{display: 'grid', gridTemplateColumns: 'repeat(8, 25px)',
  gap: '5px',}}>
      {emptyBitboard?.map((value, i) => {
        const isSelectedIndex = value === selectedIndex;

        return (
          <div
          key={'outer' + i + selectedIndex} 
          onClick={(e) => {
            e.preventDefault();

            setSelectedIndex(value);

          }} style={{
            minHeight: 30,
            minWidth: 30,
            borderWidth: 1,
            borderColor: 'black',
            borderStyle: 'solid',
            backgroundColor: isSelectedIndex ? 'blue' : 'white',
            display: 'flex',
            flexDirection: 'row',
            justifyContent:'center',
            alignContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}>
            <div key={'inner' + i + selectedIndex}>
            {value}
            </div>
          </div>
        )
      })}
      </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(8, 25px)',
  gap: '5px',}}>
      {bitboardValues?.map((value, i) => {
        const isValueOne = value === '1';
        

        return (
          <div key={'outer2-' + i + '-' + selectedIndex} style={{
            minHeight: 30,
            minWidth: 30,
            borderWidth: 1,
            borderColor: 'black',
            borderStyle: 'solid',
            backgroundColor: isValueOne ? 'blue' : 'white',
            display: 'flex',
            flexDirection: 'row',
            justifyContent:'center',
            alignContent: 'center',
            alignItems: 'center',
          }}>
            <div key={'inner2-' + i + '-' + selectedIndex}>
            {value}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  );
}

function App() {
  const [table, setTable] = useState(kingLookupTable)

  return (
    <div style={{display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', gap: 30}}>
    BITBOARD VISUALIZER
    <div style={{display: 'flex', flex: 1, flexDirection: 'row', maxHeight: 20}}>
    <button onClick={() => {
      setTable(kingLookupTable);
    }}>King table</button>
    <button onClick={() => {
      setTable(knightLookupTable);
    }}>Knight table</button>
    <button onClick={() => {
      setTable(whitePawnAttackTable);
    }}>White pawn attack table</button>
    <button onClick={() => {
      setTable(blackPawnAttackTable);
    }}>Black pawn attack table</button>
    <button onClick={() => {
      setTable(rookRelevantBlockerMask);
    }}>Rook mask</button>
        <button onClick={() => {
      setTable(bishopRelevantBlockerMask);
    }}>Bishop mask</button>

    
    </div>
    <div>
    <BitboardVisualizer key={1} bitboard={table}/>
    </div>
    </div>
  )
}

export default App
