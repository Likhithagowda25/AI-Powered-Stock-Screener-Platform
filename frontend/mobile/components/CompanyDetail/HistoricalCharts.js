import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';
import NoDataState from '../ui/NoDataState';

const screenWidth = Dimensions.get('window').width;

/**
 * HistoricalCharts - Historical data visualization for stock performance
 */
export default function HistoricalCharts({ 
  priceHistory = [],
  revenueHistory = [],
  earningsHistory = [],
  debtFcfHistory = [],
  pegHistory = []
}) {
  const { theme } = useTheme();
  const [activeChart, setActiveChart] = useState('price');

  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => theme.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.primary,
    },
    propsForBackgroundLines: {
      stroke: theme.border,
      strokeDasharray: '5,5',
    },
  };

  const chartTabs = [
    { id: 'price', label: 'Price' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'debtFcf', label: 'Debt/FCF' },
    { id: 'peg', label: 'PEG' },
  ];

  const hasData = (data) => data && data.length > 0;

  const formatChartData = (data, labelKey = 'period', valueKey = 'value') => {
    if (!hasData(data)) return null;
    
    // Filter out entries where the value is null, undefined, or invalid
    const validData = data.filter(d => {
      const val = d[valueKey];
      return val !== null && val !== undefined && !isNaN(Number(val));
    });
    
    if (validData.length === 0) return null;
    
    return {
      labels: validData.slice(-6).map(d => d[labelKey] || ''),
      datasets: [{
        data: validData.slice(-6).map(d => Number(d[valueKey]) || 0),
        strokeWidth: 2,
      }],
    };
  };

  const renderChart = () => {
    let data = null;
    let title = '';

    switch (activeChart) {
      case 'price':
        data = formatChartData(priceHistory, 'date', 'close');
        title = 'Stock Price Performance';
        break;
      case 'revenue':
        data = formatChartData(revenueHistory, 'quarter', 'revenue');
        title = 'Revenue Trend';
        break;
      case 'earnings':
        data = formatChartData(earningsHistory, 'quarter', 'eps');
        title = 'Earnings Per Share';
        break;
      case 'debtFcf':
        // Try ratio first, fall back to debtToEquity
        data = formatChartData(debtFcfHistory, 'quarter', 'ratio');
        if (!data) {
          data = formatChartData(debtFcfHistory, 'quarter', 'debtToEquity');
        }
        title = 'Debt to Equity Ratio';
        break;
      case 'peg':
        data = formatChartData(pegHistory, 'quarter', 'peg');
        title = 'PEG Ratio Evolution';
        break;
    }

    if (!data) {
      return (
        <View style={styles.noDataContainer}>
          <NoDataState
            title="Chart Data Unavailable"
            message={`Historical ${title.toLowerCase()} data is not available for this stock.`}
            icon="bar-chart-outline"
          />
        </View>
      );
    }

    return (
      <View>
        <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>{title}</Text>
        <LineChart
          data={data}
          width={screenWidth - SPACING.md * 4}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          formatYLabel={(y) => {
            const num = Number(y);
            if (isNaN(num)) return y;
            if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
            if (Math.abs(num) >= 100000) return (num / 100000).toFixed(1) + 'L';
            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toFixed(0);
          }}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Chart Tabs */}
      <View style={styles.tabsContainer}>
        {chartTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              { backgroundColor: activeChart === tab.id ? theme.primary : theme.background },
            ]}
            onPress={() => setActiveChart(tab.id)}
          >
            <Text style={[
              styles.tabText,
              { color: activeChart === tab.id ? '#fff' : theme.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Chart */}
      <View style={styles.chartContainer}>
        {renderChart()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  tabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  tab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  chart: {
    borderRadius: RADIUS.md,
  },
  noDataContainer: {
    minHeight: 200,
    justifyContent: 'center',
  },
});
