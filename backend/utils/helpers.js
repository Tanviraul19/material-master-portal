const normalizeDescription = (desc) => {
  if (!desc) return '';
  return desc.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .sort()
    .join(' ');
};

const MATERIAL_TYPE_MAPPING = {
  'ZMIS': { department: 'Mechanical', valuation_category: 'M', valuation_class: 'ZMID' },
  'ZEIS': { department: 'Electrical', valuation_category: 'E', valuation_class: 'ZEID' },
  'ZCOM': { department: 'Consumable', valuation_category: 'C', valuation_class: 'ZCOD' },
  'ZPAC': { department: 'Packaging', valuation_category: '-', valuation_class: 'ZPAC' },
  'ZNVA': { department: 'Non Valuated Asset', valuation_category: '-', valuation_class: 'ZNVA' },
  'ZNVM': { department: 'Non Valuated Material', valuation_category: '-', valuation_class: 'ZNVM' },
  'ZRET': { department: 'Returnable Packaging', valuation_category: '-', valuation_class: 'ZRET' },
  'ZPRT': { department: 'Production', valuation_category: 'T', valuation_class: 'ZPRP' },
};

module.exports = { normalizeDescription, MATERIAL_TYPE_MAPPING };
