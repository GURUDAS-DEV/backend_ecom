const technology = ['Heat Shrink'];
const type_ = ['Indoor', 'Outdoor', 'Straight through'];
const voltage = ['1.1KV(E)', '6.6KV(UE)/11KV(E)', '11KV(UE)/22KV(E)', '22KV(E)', '33KV(E)', '33KV(UE)', '66KV(E)'];
const core = ['1 CORE', '2 CORE', '3 CORE', '3.5 CORE', '4 CORE'];
const size = ['6mm', '10mm', '16mm', '25mm', '35mm', '50mm', '70mm', '95mm', '120mm', '150mm', '185mm', '240mm', '300mm', '400mm', '500mm', '630mm', '800mm', '1000mm'];
const cable_type = ['XLPE/PVC', 'EPR', 'ABC'];
const conductor = ['ALUMINIUM', 'COPPER'];

const typeToCombination = {
  'I': 'Indoor',
  'O': 'Outdoor',
  'S': 'Straight through'
};

const cableTypeToCombination = {
  'X_A': 'XLPE/PVC',
  'XXA': 'XLPE/PVC',
  'TCU': 'EPR',
  'ABU': 'ABC'
};

const conductorToCombination = {
  'A': 'ALUMINIUM',
  'C': 'COPPER'
};

const voltageToCombination = {
  '1.1E': '1.1KV(E)',
  '011E': '6.6KV(UE)/11KV(E)',
  '022E': '11KV(UE)/22KV(E)',
  '022E': '22KV(E)',
  '033E': '33KV(E)',
  'O33U': '33KV(UE)',
  '066E': '66KV(E)'
};

const coreToCombination = {
  '01C': '1 CORE',
  '02C': '2 CORE',
  '03C': '3 CORE',
  '3.5C': '3.5 CORE',
  '04C': '4 CORE'
};

const sizeToCombination = (size) => `${parseInt(size, 10)}mm`;

function parseSKUToString(sku) {
  // Extract parts of the SKU
  const type = sku[3]; // I, O, S
  console.log(type)
  const cableType = sku.slice(5, 8); // X_A, XXA, TCU, ABU
  console.log(cableType)
  const conductor = sku[8];
  console.log(conductor) // A, C
  const voltage = sku.slice(10, 14);
  console.log(voltage) // 1.1E, 011E, 022E, etc.
  const core = sku.slice(15, 18);
  console.log(core) // 01C, 02C, 03C, etc.
  const size = sku.slice(18);
  console.log(size) // e.g., 0600 for 6mm

  // Map SKU parts to their corresponding values
  const technologyValue = technology[0]; // Assuming the technology is always "Heat Shrink"
  const typeValue = typeToCombination[type];
  const cableTypeValue = cableTypeToCombination[cableType];
  const conductorValue = conductorToCombination[conductor];
  const voltageValue = voltageToCombination[voltage];
  const coreValue = coreToCombination[core];
  const sizeValue = sizeToCombination(size);

  // Return the combination
  return {
    Technology: technologyValue,
    Type: typeValue,
    Voltage: voltageValue,
    Core: coreValue,
    Size: sizeValue,
    CableType: cableTypeValue,
    Conductor: conductorValue,
    SKU: sku,
    Combination: `${technologyValue} ${typeValue} ${voltageValue} ${coreValue} ${sizeValue} ${cableTypeValue} ${conductorValue}`
  };
}

// Example SKU
const sku = '3MHS_A_022E_01C0120';
const combination = parseSKUToString(sku);

console.log(combination);

module.exports = parseSKUToString