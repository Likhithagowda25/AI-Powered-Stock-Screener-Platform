import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../constants/colors';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import NoDataState from '../components/ui/NoDataState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

import { API_BASE_URL } from '../services/api/config';

const API_BASE = API_BASE_URL;
const API_HEADERS = { 'Content-Type': 'application/json' };

export default function PortfolioScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    avg_buy_price: '',
    notes: ''
  });
  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);

  // Fetch portfolio when screen first loads
  useEffect(() => {
    if (user?.userId) {
      fetchPortfolio();
    } else {
      setLoading(false);
      setError('Please log in to view your portfolio.');
    }
  }, [user?.userId]);

  // Refresh portfolio when screen comes into focus (for instant updates)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.userId) {
        // Silent refresh when coming back to screen
        fetchPortfolio(true);
      }
    });

    return unsubscribe;
  }, [navigation, user?.userId]);

  const fetchPortfolio = async (silent = false) => {
    if (!user?.userId) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    if (!silent) {
      setError(null);
    }
    try {
      // First get user's portfolios to find the default one
      const portfoliosResponse = await fetch(`${API_BASE}/portfolios?user_id=${user.userId}`);
      
      if (!portfoliosResponse.ok) {
        throw new Error(`Server error: ${portfoliosResponse.status}`);
      }
      
      const portfoliosData = await portfoliosResponse.json();
      
      console.log('PortfolioScreen - Portfolios response:', JSON.stringify(portfoliosData, null, 2));
      
      if (!portfoliosData.success || !portfoliosData.data || portfoliosData.data.length === 0) {
        // No portfolio found - show empty state instead of error
        console.log('PortfolioScreen - No portfolio found');
        setHoldings([]);
        setSummary(null);
        setLoading(false);
        return;
      }
      
      const portfolioId = portfoliosData.data[0].portfolio_id;
      console.log('PortfolioScreen - Using portfolio ID:', portfolioId);
      
      // Fetch holdings and summary in parallel
      const [holdingsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE}/portfolios/${portfolioId}/holdings?user_id=${user.userId}&_t=${Date.now()}`),
        fetch(`${API_BASE}/portfolios/${portfolioId}/summary?user_id=${user.userId}&_t=${Date.now()}`)
      ]);
      
      const holdingsData = await holdingsResponse.json();
      const summaryData = await summaryResponse.json();
      
      console.log('PortfolioScreen - Holdings response:', JSON.stringify(holdingsData, null, 2));
      console.log('PortfolioScreen - Summary response:', JSON.stringify(summaryData, null, 2));
      
      // Use holdings from summaryData if available (they have calculated values like current_price)
      const rawHoldings = summaryData.success && summaryData.data?.holdings 
        ? summaryData.data.holdings 
        : (holdingsData.data || []);

      if (holdingsData.success || summaryData.success) {
        // Normalize field names: backend uses holding_id/average_buy_price, frontend uses id/avg_buy_price
        const normalizedHoldings = rawHoldings.map(h => ({
          ...h,
          id: h.holding_id || h.id,
          avg_buy_price: parseFloat(h.average_buy_price || h.avg_buy_price || 0),
          current_price: parseFloat(h.current_price || 0),
          quantity: parseFloat(h.quantity || 0),
          // Backend uses 'invested', frontend might use 'total_invested'
          total_invested: parseFloat(h.invested || h.total_invested || 0),
          current_value: parseFloat(h.current_value || 0),
          gain_loss: parseFloat(h.gain_loss || 0),
          gain_loss_percent: parseFloat(h.gain_loss_percent || 0),
          portfolio_id: portfolioId
        }));
        
        console.log('PortfolioScreen - Setting holdings:', normalizedHoldings.length, 'items');
        setHoldings(normalizedHoldings);
        setCurrentPortfolioId(portfolioId);
      } else {
        console.log('PortfolioScreen - Data fetch failed');
        setHoldings([]);
      }
      
      if (summaryData.success && summaryData.data) {
        setSummary(summaryData.data.summary || summaryData.data || null);
      } else {
        setSummary(null);
      }
      
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      // More user-friendly error messages
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please check if the backend is running on port 8080.');
      } else if (err.message?.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError(`Unable to load portfolio: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolio();
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchPortfolio();
  };

  const openAddModal = () => {
    setEditingHolding(null);
    setFormData({ ticker: '', quantity: '', avg_buy_price: '', notes: '' });
    setModalVisible(true);
  };

  const openEditModal = (holding) => {
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
      toast.warning('Please fill in ticker, quantity, and buy price.');
      return;
    }

    // First, get the user's portfolio ID
    let portfolioId;
    try {
      const portfoliosResponse = await fetch(`${API_BASE}/portfolios?user_id=${user.userId}`);
      const portfoliosData = await portfoliosResponse.json();
      
      if (portfoliosData.success && portfoliosData.data && portfoliosData.data.length > 0) {
        portfolioId = portfoliosData.data[0].portfolio_id;
      } else {
        // No portfolio exists, create one first
        const createResponse = await fetch(`${API_BASE}/portfolios`, {
          method: 'POST',
          headers: { ...API_HEADERS, 'x-user-id': user.userId },
          body: JSON.stringify({ name: 'My Portfolio', description: 'Default portfolio' })
        });
        const createData = await createResponse.json();
        if (createData.success) {
          portfolioId = createData.data.portfolio_id;
        } else {
          toast.error('Could not create portfolio. Please try again.');
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      toast.error('Could not access portfolio. Please try again.');
      return;
    }

    let tickerToAdd = formData.ticker.toUpperCase().trim();
    if (!tickerToAdd.includes('.')) {
      tickerToAdd = tickerToAdd + '.NS';
    }

    const payload = {
      user_id: user?.userId,
      ticker: tickerToAdd,
      quantity: parseFloat(formData.quantity),
      average_buy_price: parseFloat(formData.avg_buy_price), // Backend expects average_buy_price
      notes: formData.notes
    };

    console.log('PortfolioScreen - Submitting holding:', JSON.stringify(payload, null, 2));
    console.log('PortfolioScreen - Using portfolio ID:', portfolioId);

    try {
      let response;
      
      if (editingHolding) {
        // Update holding in specific portfolio
        const holdingPortfolioId = editingHolding.portfolio_id || portfolioId;
        response = await fetch(
          `${API_BASE}/portfolios/${holdingPortfolioId}/holdings/${editingHolding.id}`,
          {
            method: 'PUT',
            headers: { ...API_HEADERS, 'x-user-id': user.userId },
            body: JSON.stringify({
              quantity: payload.quantity,
              average_buy_price: payload.average_buy_price,
              notes: payload.notes
            })
          }
        );
      } else {
        // Add holding to user's portfolio
        response = await fetch(`${API_BASE}/portfolios/${portfolioId}/holdings`, {
          method: 'POST',
          headers: { ...API_HEADERS, 'x-user-id': user.userId },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();
      console.log('PortfolioScreen - Response:', JSON.stringify(data, null, 2));

      if (data.success) {
        toast.success(editingHolding ? 'Holding updated!' : `${tickerToAdd} added to portfolio!`);
        setModalVisible(false);
        fetchPortfolio();
      } else {
        // Show helpful error message
        const errorMsg = data.error?.message || data.error || 'Could not save holding.';
        console.error('PortfolioScreen - Error:', errorMsg);
        if (errorMsg.includes('Invalid ticker')) {
          toast.error(`Stock "${tickerToAdd}" not found in database. Please check the symbol.`);
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error saving holding:', err);
      toast.error('Unable to save holding. Please check your connection.');
    }
  };

  const removeHolding = async (id, ticker) => {
    setConfirmDelete({ id, ticker });
  };

  const confirmRemoveHolding = async () => {
    if (!confirmDelete) return;
    
    const { id, ticker } = confirmDelete;
    setConfirmDelete(null);
    
    try {
      // Use the stored portfolio ID or fetch it if not available
      let portfolioId = currentPortfolioId;
      if (!portfolioId) {
        const portfoliosResponse = await fetch(`${API_BASE}/portfolios?user_id=${user.userId}`);
        const portfoliosData = await portfoliosResponse.json();
        if (portfoliosData.success && portfoliosData.data && portfoliosData.data.length > 0) {
          portfolioId = portfoliosData.data[0].portfolio_id;
        }
      }
      
      if (!portfolioId) {
        toast.error('Portfolio not found.');
        return;
      }
      
      const response = await fetch(
        `${API_BASE}/portfolios/${portfolioId}/holdings/${id}`,
        { 
          method: 'DELETE',
          headers: { ...API_HEADERS, 'x-user-id': user.userId }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`${ticker} removed from portfolio`);
        fetchPortfolio();
      } else {
        toast.error('Unable to remove holding. Please try again.');
      }
    } catch (err) {
      console.error('Error removing holding:', err);
      toast.error('Unable to remove holding. Please check your connection.');
    }
  };

  const navigateToCompanyDetail = (item) => {
    navigation?.navigate('CompanyDetail', {
      company: {
        ticker: item.ticker,
        name: item.company_name,
        sector: item.sector,
        current_price: item.current_price,
      }
    });
  };

  const renderHolding = ({ item }) => {
    const isProfit = (item.gain_loss || 0) >= 0;

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} 
        onPress={() => navigateToCompanyDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.stockInfo}>
            <Text style={[styles.ticker, { color: theme.primary }]}>{item.ticker}</Text>
            <Text style={[styles.companyName, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.company_name || 'Company Name'}
            </Text>
            <Text style={[styles.quantity, { color: theme.textTertiary }]}>{item.quantity} shares</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              removeHolding(item.id, item.ticker);
            }}
            style={styles.removeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        </View>

        <View style={[styles.priceSection, { borderTopColor: theme.border }]}>
          <View>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Buy Price</Text>
            <Text style={[styles.price, { color: theme.textPrimary }]}>
              ₹{Number(item.avg_buy_price || 0).toFixed(2)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Current Price</Text>
            <Text style={[styles.price, { color: theme.textPrimary }]}>
              ₹{Number(item.current_price || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.valueSection}>
          <View>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Invested</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>
              ₹{Number(item.total_invested || 0).toLocaleString()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Current Value</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>
              ₹{Number(item.current_value || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[
          styles.gainLossSection, 
          { 
            backgroundColor: isProfit ? theme.success + '15' : theme.error + '15',
            borderColor: isProfit ? theme.success + '30' : theme.error + '30',
          }
        ]}>
          <Ionicons 
            name={isProfit ? "trending-up" : "trending-down"} 
            size={20} 
            color={isProfit ? theme.success : theme.error} 
          />
          <Text style={[styles.gainLoss, { color: isProfit ? theme.success : theme.error }]}>
            {isProfit ? '+' : ''}₹{Number(item.gain_loss || 0).toFixed(2)}
          </Text>
          <Text style={[styles.gainLossPercent, { color: isProfit ? theme.success : theme.error }]}>
            ({isProfit ? '+' : ''}{Number(item.gain_loss_percent || 0).toFixed(2)}%)
          </Text>
        </View>

        {item.notes && (
          <View style={[styles.notesSection, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <Text style={[styles.notesText, { color: theme.primary }]}>{item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return <LoadingOverlay message="Loading portfolio..." subMessage="Calculating your investments" />;
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Portfolio" />
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconCircle, { backgroundColor: theme.errorBackground }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Unable to Load</Text>
          <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{error}</Text>
          <Button title="Try Again" icon="refresh-outline" onPress={handleRetry} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Portfolio"
        subtitle={`${holdings.length} holdings`}
        rightAction={{
          icon: "add",
          onPress: openAddModal
        }}
      />

      {summary && (
        <LinearGradient
          colors={theme.gradientPrimary || ['#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1}}
          style={[styles.summaryCard, SHADOWS.medium]}
        >
          <Text style={styles.summaryTitleWhite}>Portfolio Value</Text>
          <Text style={styles.summaryValueWhite}>
            ₹{Number(summary.total_current_value || summary.total_value || 0).toLocaleString()}
          </Text>
          
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabelWhite}>Invested</Text>
              <Text style={styles.summaryTextWhite}>
                ₹{Number(summary.total_invested || 0).toLocaleString()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabelWhite}>Gain/Loss</Text>
              <View style={[
                styles.gainLossBadge,
                { backgroundColor: (summary.total_gain_loss || 0) >= 0 ? '#10B981' : '#EF4444' }
              ]}>
                <Text style={styles.summaryGainLossWhite}>
                  {(summary.total_gain_loss || 0) >= 0 ? '+' : ''}₹{Number(summary.total_gain_loss || 0).toFixed(2)}
                </Text>
                <Text style={styles.summaryGainLossPercentWhite}>
                 ({(summary.total_gain_loss || 0) >= 0 ? '+' : ''}{Number(summary.total_gain_loss_percent || 0).toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Confirmation Banner for Deleting Holdings */}
      {confirmDelete && (
        <View style={[styles.confirmBanner, { backgroundColor: theme.errorBackground, borderColor: theme.error }]}>
          <Text style={[styles.confirmText, { color: theme.textPrimary }]}>
            Remove <Text style={{ fontWeight: '700' }}>{confirmDelete.ticker}</Text> from portfolio?
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              onPress={() => setConfirmDelete(null)}
              style={[styles.confirmButton, styles.cancelButton, { borderColor: theme.border }]}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={confirmRemoveHolding}
              style={[styles.confirmButton, styles.removeButton2, { backgroundColor: theme.error }]}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={holdings}
        renderItem={renderHolding}
        keyExtractor={(item, index) => (item.id || index).toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <NoDataState
            title="No Holdings Yet"
            message="Add stocks to your portfolio to track your investments and monitor gains/losses."
            icon="briefcase-outline"
          />
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.backdropDim }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {editingHolding ? 'Edit Holding' : 'Add Holding'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Stock Ticker (e.g., RELIANCE.NS)"
                placeholderTextColor={theme.placeholder}
                value={formData.ticker}
                onChangeText={(text) => setFormData({ ...formData, ticker: text })}
                autoCapitalize="characters"
                editable={!editingHolding}
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Quantity"
                placeholderTextColor={theme.placeholder}
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Average Buy Price"
                placeholderTextColor={theme.placeholder}
                value={formData.avg_buy_price}
                onChangeText={(text) => setFormData({ ...formData, avg_buy_price: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Notes (optional)"
                placeholderTextColor={theme.placeholder}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
              />

              <Button
                title={editingHolding ? 'Update Holding' : 'Add Holding'}
                onPress={handleSubmit}
                fullWidth
                style={styles.modalSubmitButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    padding: SPACING.lg,
    margin: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  summaryTitleWhite: {
    ...TYPOGRAPHY.bodySmall,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  summaryValueWhite: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
  },
  summaryTitle: {
    ...TYPOGRAPHY.bodySmall,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  summaryLabelWhite: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    opacity: 0.85,
    marginBottom: 4,
    fontSize: 11,
  },
  summaryTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gainLossBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  summaryGainLossWhite: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryGainLossPercentWhite: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: 2,
  },
  summaryText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  summaryGainLoss: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  stockInfo: {
    flex: 1,
  },
  ticker: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  companyName: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
  quantity: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  removeButton: {
    padding: SPACING.xs,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  label: {
    ...TYPOGRAPHY.caption,
    marginBottom: 2,
  },
  price: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  valueSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  value: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  gainLossSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
  },
  gainLoss: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
  gainLossPercent: {
    ...TYPOGRAPHY.bodySmall,
    marginLeft: 4,
  },
  notesSection: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  notesText: {
    ...TYPOGRAPHY.caption,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSubmitButton: {
    marginTop: SPACING.md,
  },
  // Confirmation banner styles
  confirmBanner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  confirmText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  confirmButton: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  removeButton2: {
    borderWidth: 0,
  },
  removeButtonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
