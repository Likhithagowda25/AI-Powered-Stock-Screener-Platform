import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Align with backend API gateway and other mobile portfolio screen
const API_BASE = 'http://localhost:8080/api/v1';
const USER_ID = 1; // TODO: Get from auth context
const API_HEADERS = {
  'Content-Type': 'application/json',
  'X-User-ID': String(USER_ID),
};

interface PortfolioHolding {
  id: number;
  ticker: string;
  company_name: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  total_invested: number;
  current_price: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  notes: string;
}

interface PortfolioSummary {
  total_value: number;
  total_invested: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
}

export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    avg_buy_price: '',
    notes: ''
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const portfolioId = 1; // default portfolio

      // Fetch holdings and summary in parallel (matches JS PortfolioScreen)
      const [holdingsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE}/portfolios/${portfolioId}/holdings`, {
          headers: API_HEADERS,
        }),
        fetch(`${API_BASE}/portfolios/${portfolioId}/summary`, {
          headers: API_HEADERS,
        }),
      ]);

      const holdingsData = await holdingsResponse.json();
      const summaryData = await summaryResponse.json();

      if (holdingsData.success) {
        setHoldings(holdingsData.data || []);
      }

      if (summaryData.success) {
        setSummary(summaryData.data || null);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      Alert.alert('Error', 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolio();
  };

  const openAddModal = () => {
    setEditingHolding(null);
    setFormData({ ticker: '', quantity: '', avg_buy_price: '', notes: '' });
    setModalVisible(true);
  };

  const openEditModal = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setFormData({
      ticker: holding.ticker,
      quantity: holding.quantity.toString(),
      avg_buy_price: holding.avg_buy_price.toString(),
      notes: holding.notes || ''
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.ticker.trim() || !formData.quantity || !formData.avg_buy_price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const payload = {
      user_id: USER_ID,
      ticker: formData.ticker.toUpperCase(),
      quantity: parseFloat(formData.quantity),
      avg_buy_price: parseFloat(formData.avg_buy_price),
      notes: formData.notes
    };

    try {
      let response;
      const portfolioId = 1; // default portfolio

      if (editingHolding) {
        // Update existing holding
        response = await fetch(
          `${API_BASE}/portfolios/${portfolioId}/holdings/${editingHolding.id}`,
          {
            method: 'PUT',
            headers: API_HEADERS,
            body: JSON.stringify({
              quantity: payload.quantity,
              avg_buy_price: payload.avg_buy_price,
              notes: payload.notes
            })
          }
        );
      } else {
        // Add new holding
        response = await fetch(`${API_BASE}/portfolios/${portfolioId}/holdings`, {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', editingHolding ? 'Holding updated' : 'Holding added');
        setModalVisible(false);
        fetchPortfolio();
      } else {
        Alert.alert('Error', data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving holding:', error);
      Alert.alert('Error', 'Failed to save holding');
    }
  };

  const removeHolding = async (id: number, ticker: string) => {
    Alert.alert(
      'Remove Holding',
      `Remove ${ticker} from portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const portfolioId = 1; // default portfolio
              const response = await fetch(
                `${API_BASE}/portfolios/${portfolioId}/holdings/${id}`,
                { method: 'DELETE', headers: API_HEADERS }
              );

              const data = await response.json();

              if (data.success) {
                fetchPortfolio();
              } else {
                Alert.alert('Error', 'Failed to remove holding');
              }
            } catch (error) {
              console.error('Error removing holding:', error);
              Alert.alert('Error', 'Failed to remove holding');
            }
          }
        }
      ]
    );
  };

  const renderHolding = ({ item }: { item: PortfolioHolding }) => {
    const isProfit = item.gain_loss >= 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.stockInfo}>
            <Text style={styles.ticker}>{item.ticker}</Text>
            <Text style={styles.companyName}>{item.company_name}</Text>
            <Text style={styles.quantity}>{item.quantity} shares</Text>
          </View>
          <TouchableOpacity
            onPress={() => removeHolding(item.id, item.ticker)}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.priceSection}>
          <View>
            <Text style={styles.label}>Buy Price</Text>
            <Text style={styles.price}>₹{item.avg_buy_price.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Current Price</Text>
            <Text style={styles.price}>₹{item.current_price?.toFixed(2) || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.valueSection}>
          <View>
            <Text style={styles.label}>Invested</Text>
            <Text style={styles.value}>₹{item.total_invested.toLocaleString()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Current Value</Text>
            <Text style={styles.value}>₹{item.current_value?.toLocaleString() || 'N/A'}</Text>
          </View>
        </View>

        <View style={[styles.gainLossSection, isProfit ? styles.profitBg : styles.lossBg]}>
          <Ionicons 
            name={isProfit ? "trending-up" : "trending-down"} 
            size={20} 
            color={isProfit ? "#10b981" : "#ef4444"} 
          />
          <Text style={[styles.gainLoss, isProfit ? styles.profit : styles.loss]}>
            {isProfit ? '+' : ''}₹{item.gain_loss?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.gainLossPercent, isProfit ? styles.profit : styles.loss]}>
            ({isProfit ? '+' : ''}{item.gain_loss_percent?.toFixed(2) || '0.00'}%)
          </Text>
        </View>

        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portfolio</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Portfolio Value</Text>
          <Text style={styles.summaryValue}>₹{summary.total_value.toLocaleString()}</Text>
          
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Invested</Text>
              <Text style={styles.summaryText}>₹{summary.total_invested.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
              <Text style={[
                styles.summaryGainLoss,
                summary.total_gain_loss >= 0 ? styles.profit : styles.loss
              ]}>
                {summary.total_gain_loss >= 0 ? '+' : ''}₹{summary.total_gain_loss.toFixed(2)}
                {' '}({summary.total_gain_loss >= 0 ? '+' : ''}{summary.total_gain_loss_percent.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={holdings}
        renderItem={renderHolding}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No holdings in portfolio</Text>
            <Text style={styles.emptySubtext}>Add stocks to track your investments</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHolding ? 'Edit Holding' : 'Add Holding'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Stock Ticker (e.g., RELIANCE.NS)"
              value={formData.ticker}
              onChangeText={(text) => setFormData({ ...formData, ticker: text })}
              autoCapitalize="characters"
              editable={!editingHolding}
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Average Buy Price"
              value={formData.avg_buy_price}
              onChangeText={(text) => setFormData({ ...formData, avg_buy_price: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>
                {editingHolding ? 'Update Holding' : 'Add Holding'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryGainLoss: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockInfo: {
    flex: 1,
  },
  ticker: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  companyName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  quantity: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  valueSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  gainLossSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  profitBg: {
    backgroundColor: '#d1fae5',
  },
  lossBg: {
    backgroundColor: '#fee2e2',
  },
  gainLoss: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  gainLossPercent: {
    fontSize: 14,
    marginLeft: 4,
  },
  profit: {
    color: '#10b981',
  },
  loss: {
    color: '#ef4444',
  },
  notesSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  notesText: {
    fontSize: 12,
    color: '#92400e',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
