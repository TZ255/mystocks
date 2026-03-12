// Static mapping of DSE symbols to company info
const dseCompanies = {
  CRDB: { name: 'CRDB Bank Plc', sector: 'Banking' },
  NMB: { name: 'NMB Bank Plc', sector: 'Banking' },
  DCB: { name: 'DCB Commercial Bank Plc', sector: 'Banking' },
  MBP: { name: 'Mkombozi Commercial Bank Plc', sector: 'Banking' },
  MKCB: { name: 'Mwalimu Commercial Bank Plc', sector: 'Banking' },
  YETU: { name: 'Yetu Microfinance Bank Plc', sector: 'Banking' },
  MUCOBA: { name: 'Mufindi Community Bank Plc', sector: 'Banking' },
  MANICA: { name: 'Manica Freight Services (T) Ltd', sector: 'Banking' },
  TBL: { name: 'Tanzania Breweries Ltd', sector: 'Manufacturing' },
  TCC: { name: 'Tanzania Cigarette Company Ltd', sector: 'Manufacturing' },
  TOL: { name: 'Tanzania Oil & Gas Plc', sector: 'Manufacturing' },
  SWIS: { name: 'Swissport Tanzania Plc', sector: 'Services' },
  DSE: { name: 'Dar es Salaam Stock Exchange Plc', sector: 'Financial Services' },
  NICO: { name: 'NICO (Tanzania) Ltd', sector: 'Insurance' },
  PAL: { name: 'PAL Pensions Tanzania Ltd', sector: 'Financial Services' },
  JHL: { name: 'Japaul Holdings Ltd', sector: 'Diversified' },
  TPCC: { name: 'Tanzania Portland Cement Company Ltd', sector: 'Manufacturing' },
  USL: { name: 'USL Group Plc', sector: 'Manufacturing' },
  TWIGA: { name: 'Twiga Cement Plc', sector: 'Manufacturing' },
  JATU: { name: 'Jatu Plc', sector: 'Services' },
  TCCIA: { name: 'TCCIA Investment Plc', sector: 'Investment' },
  VODA: { name: 'Vodacom Tanzania Plc', sector: 'Telecommunications' },
  TISS: { name: 'Tanzania Integrated Security Solutions Plc', sector: 'Services' },
  KA: { name: 'Kenya Airways', sector: 'Aviation' },
  JE: { name: 'Jubilee Holdings Ltd', sector: 'Insurance' },
  EABL: { name: 'East African Breweries Ltd', sector: 'Manufacturing' },
  KCB: { name: 'KCB Group Plc', sector: 'Banking' },
  NMG: { name: 'Nation Media Group Ltd', sector: 'Media' },
  USH: { name: 'Uchumi Supermarkets Holdings', sector: 'Retail' },
};

export const getCompanyInfo = (symbol) => {
  return dseCompanies[symbol] || { name: symbol, sector: 'Unknown' };
};

export default dseCompanies;
