/**
 * Export Utilities for Screener Results
 * 
 * Provides functionality to export screener results in various formats:
 * - CSV export
 * - Share functionality via native share API or web download
 */

import { Platform, Share } from 'react-native';

// Import only on native platforms
let Sharing, FileSystem;
if (Platform.OS !== 'web') {
  Sharing = require('expo-sharing');
  FileSystem = require('expo-file-system');
}

/**
 * Convert screener results to CSV format
 * 
 * @param {Array} results - Array of stock results
 * @param {Object} options - Export options
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (results, options = {}) => {
  if (!results || results.length === 0) {
    return '';
  }

  const {
    includeHeaders = true,
    columns = null, // null means all columns
    delimiter = ',',
  } = options;

  // Define column configuration
  const defaultColumns = [
    { key: 'ticker', label: 'Ticker' },
    { key: 'name', label: 'Company Name' },
    { key: 'pe_ratio', label: 'P/E Ratio' },
    { key: 'pb_ratio', label: 'P/B Ratio' },
    { key: 'roe', label: 'ROE (%)' },
    { key: 'roa', label: 'ROA (%)' },
    { key: 'market_cap', label: 'Market Cap (Cr)' },
    { key: 'revenue', label: 'Revenue (Cr)' },
    { key: 'eps', label: 'EPS' },
    { key: 'operating_margin', label: 'Operating Margin (%)' },
    { key: 'net_margin', label: 'Net Margin (%)' },
    { key: 'debt_to_equity', label: 'Debt/Equity' },
    { key: 'current_ratio', label: 'Current Ratio' },
    { key: 'peg_ratio', label: 'PEG Ratio' },
    { key: 'fcf_margin', label: 'FCF Margin (%)' },
  ];

  const columnsToUse = columns || defaultColumns;

  // Build header row
  const rows = [];
  if (includeHeaders) {
    const headerRow = columnsToUse.map(col => `"${col.label}"`).join(delimiter);
    rows.push(headerRow);
  }

  // Build data rows
  results.forEach(stock => {
    const row = columnsToUse.map(col => {
      const value = stock[col.key];
      if (value === null || value === undefined) {
        return '""';
      }
      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(delimiter);
    rows.push(row);
  });

  return rows.join('\n');
};

/**
 * Export results to CSV file and share
 * 
 * @param {Array} results - Array of stock results
 * @param {string} filename - Name for the exported file
 * @param {string} query - Original query (for metadata)
 * @returns {Promise<boolean>} Success status
 */
export const exportToCSV = async (results, filename = 'screener_results', query = '') => {
  try {
    // Generate CSV content with metadata header
    const timestamp = new Date().toISOString().split('T')[0];
    const metadataHeader = `# Screener Results Export\n# Date: ${timestamp}\n# Query: ${query}\n# Total Results: ${results.length}\n\n`;
    const csvContent = convertToCSV(results);
    const fullContent = metadataHeader + csvContent;

    if (Platform.OS === 'web') {
      // Web: Download file using browser API
      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } else {
      // Native: Use expo-sharing
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const fileUri = FileSystem.documentDirectory + `${filename}_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, fullContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Screener Results',
        UTI: 'public.comma-separated-values-text',
      });

      return true;
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

/**
 * Share results as plain text summary
 * 
 * @param {Array} results - Array of stock results  
 * @param {string} query - Original query
 * @returns {Promise<boolean>} Success status
 */
export const shareResultsSummary = async (results, query = '') => {
  try {
    // Build text summary
    let summary = 'Stock Screener Results\n';
    summary += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    if (query) {
      summary += `Query: "${query}"\n`;
    }
    summary += `Found: ${results.length} stocks\n\n`;

    results.forEach((stock, index) => {
      summary += `${index + 1}. ${stock.ticker} - ${stock.name || 'N/A'}\n`;
      if (stock.pe_ratio) summary += `   P/E: ${stock.pe_ratio.toFixed(2)}`;
      if (stock.roe) summary += ` | ROE: ${stock.roe.toFixed(1)}%`;
      if (stock.market_cap) summary += ` | MCap: ₹${formatNumber(stock.market_cap)} Cr`;
      summary += '\n\n';
    });



    console.log(`[shareResultsSummary] Sharing ${results.length} items on ${Platform.OS}`);
    
    if (Platform.OS === 'web') {
      // Priority 1: Web Share API (Mobile Safari/Chrome, Desktop Safari)
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Screener Results',
            text: summary,
          });
          return true;
        } catch (error) {
          console.log('Web Share API failed or cancelled, falling back to clipboard', error);
        }
      }

      // Priority 2: Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summary);
        alert(`Copied summary of ${results.length} stocks to clipboard!`);
        return true;
      }
      
      // Priority 3: Download as text file
      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      
      link.setAttribute('href', url);
      link.setAttribute('download', `screener_summary_${timestamp}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } else {
      // Native: Use React Native Share API
      try {
        const result = await Share.share({
          message: summary,
          title: 'Screener Results',
        });
        
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            // shared with activity type of result.activityType
          } else {
            // shared
          }
          return true;
        } else if (result.action === Share.dismissedAction) {
          // dismissed
          return false;
        }
      } catch (error) {
        throw error;
      }
    }
  } catch (error) {
    console.error('Share error:', error);
    throw error;
  }
};

// Helper function for number formatting
const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 100000) {
    return (num / 100000).toFixed(2) + 'L';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
};

export default {
  convertToCSV,
  exportToCSV,
  shareResultsSummary,
};
