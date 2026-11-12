// 官方序列与单位；缺失年份保持缺失，不把当前值倒填为历史。
export const LIVING_INDICATORS = {
  secondary: { id: 'SE.SEC.ENRR', name: '中学毛入学率', unit: '%（可超过100）', source: 'UNESCO UIS / WDI' },
  tertiary: { id: 'SE.TER.ENRR', name: '高等教育毛入学率', unit: '%（可超过100）', source: 'UNESCO UIS / WDI' },
  unemployment: { id: 'SL.UEM.TOTL.ZS', name: '失业率（ILO模型估计）', unit: '%劳动力', source: 'ILO / WDI' },
  empAgr: { id: 'SL.AGR.EMPL.ZS', name: '农业就业份额（ILO模型估计）', unit: '%就业人口', source: 'ILO / WDI' },
  empInd: { id: 'SL.IND.EMPL.ZS', name: '工业就业份额（ILO模型估计）', unit: '%就业人口', source: 'ILO / WDI' },
  empSer: { id: 'SL.SRV.EMPL.ZS', name: '服务业就业份额（ILO模型估计）', unit: '%就业人口', source: 'ILO / WDI' },
  oop: { id: 'SH.XPD.OOPC.CH.ZS', name: '居民自付卫生支出占当期卫生总支出', unit: '%卫生支出（非个人账单比例）', source: 'WHO GHED / WDI' },
  water: { id: 'SH.H2O.BASW.ZS', name: '至少基本饮水服务覆盖率', unit: '%人口', source: 'WHO/UNICEF JMP / WDI' },
  gdpReal: { id: 'NY.GDP.PCAP.KD', name: '不变价人均GDP', unit: '2015不变美元', source: 'World Bank / WDI' },
  pppReal: { id: 'NY.GDP.PCAP.PP.KD', name: '不变价PPP人均GDP', unit: '2021不变国际元', source: 'ICP / World Bank / WDI' },
};
