import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
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

export default function WatchlistScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // For inline confirmation

  // Fetch watchlist when screen first loads
  useEffect(() => {
    if (user?.userId) {
      fetchWatchlist();
    } else {
      setLoading(false);
      setError('Please log in to view your watchlist.');
    }
  }, [user?.userId]);

  // Refresh watchlist when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.userId) {
        // Silent refresh when coming back to screen
        fetchWatchlist(true);
      }
    });

    return unsubscribe;
  }, [navigation, user?.userId]);

  const fetchWatchlist = async (silent = false) => {
    if (!user?.userId) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    if (!silent) {
      setError(null);
    }
    try {
      // First get user's watchlists
      const watchlistsResponse = await fetch(`${API_BASE}/watchlists?user_id=${user.userId}&_t=${Date.now()}`);
      const watchlistsData = await watchlistsResponse.json();
      
      console.log('Watchlists response:', watchlistsData);
      
      if (!watchlistsData.success || !watchlistsData.data || watchlistsData.data.length === 0) {
        setWatchlist([]);
        setLoading(false);
        return;
      }
      
      // Get items from the default watchlist (first one)
      const defaultWatchlist = watchlistsData.data.find(w => w.is_default) || watchlistsData.data[0];
      const watchlistId = defaultWatchlist.watchlist_id;
      
      const itemsResponse = await fetch(`${API_BASE}/watchlists/${watchlistId}/items?user_id=${user.userId}&_t=${Date.now()}`);
      const itemsData = await itemsResponse.json();
      
      console.log('Watchlist items response:', itemsData);
      
      if (itemsData.success) {
        // Map item_id to id for consistency
        const items = (itemsData.data || []).map(item => ({
          ...item,
          id: item.item_id,
          analyst_target: item.target_price ? parseFloat(item.target_price) : null,
          current_price: item.current_price ? parseFloat(item.current_price) : null,
        }));
        setWatchlist(items);
      } else {
        setWatchlist([]);
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError('Network connection issue. Please check your internet and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWatchlist();
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchWatchlist();
  };

  const addToWatchlist = async () => {
    if (!newTicker.trim()) {
      toast.warning('Please enter a stock ticker symbol.');
      return;
    }

    if (!user?.userId) {
      toast.error('Please log in to add stocks to watchlist.');
      return;
    }

    try {
      // First get the default watchlist
      const watchlistsResponse = await fetch(`${API_BASE}/watchlists?user_id=${user.userId}`);
      const watchlistsData = await watchlistsResponse.json();
      
      let watchlistId;
      
      if (watchlistsData.success && watchlistsData.data?.length > 0) {
        watchlistId = watchlistsData.data[0].watchlist_id;
      } else {
        // Create a default watchlist if none exists
        const createResponse = await fetch(`${API_BASE}/watchlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.userId },
          body: JSON.stringify({
            user_id: user.userId,
            name: 'My Watchlist',
            description: 'Default watchlist',
            is_default: true
          })
        });
        const createData = await createResponse.json();
        if (createData.success) {
          watchlistId = createData.data.watchlist_id;
        } else {
          throw new Error('Could not create watchlist');
        }
      }
      
      // Add item to the watchlist - auto-append .NS if not present for NSE stocks
      let tickerToAdd = newTicker.toUpperCase().trim();
      if (!tickerToAdd.includes('.')) {
        tickerToAdd = tickerToAdd + '.NS';
      }

      // Check for duplicates
      const isDuplicate = watchlist.some(item => item.ticker === tickerToAdd);
      if (isDuplicate) {
        toast.info(`${tickerToAdd} is already in your watchlist.`);
        setAddingStock(false);
        setNewTicker('');
        return;
      }
      
      const response = await fetch(`${API_BASE}/watchlists/${watchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.userId },
        body: JSON.stringify({
          ticker: tickerToAdd,
          notes: newNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${tickerToAdd} added to watchlist!`);
        setNewTicker('');
        setNewNotes('');
        setAddingStock(false);
        fetchWatchlist();
      } else {
        // Show helpful error message for invalid ticker
        const errorMsg = data.error?.message || data.error || 'Could not add stock.';
        if (errorMsg.includes('Invalid ticker')) {
          toast.error(`Stock "${tickerToAdd}" not found in database. Please check the symbol.`);
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      toast.error('Unable to add stock. Please check your connection.');
    }
  };

  const removeFromWatchlist = async (itemId, ticker) => {
    // Set the item to confirm delete
    setConfirmDelete({ itemId, ticker });
  };

  const confirmRemoveFromWatchlist = async () => {
    if (!confirmDelete) return;
    
    const { itemId, ticker } = confirmDelete;
    setConfirmDelete(null);
    
    try {
      // Get the default watchlist ID first
      const watchlistsResponse = await fetch(`${API_BASE}/watchlists?user_id=${user?.userId}`);
      const watchlistsData = await watchlistsResponse.json();
      const watchlistId = watchlistsData.data?.[0]?.watchlist_id;
      
      if (!watchlistId) {
        toast.error('Watchlist not found');
        return;
      }
      
      const response = await fetch(
        `${API_BASE}/watchlists/${watchlistId}/items/${itemId}?user_id=${user?.userId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`${ticker} removed from watchlist`);
        fetchWatchlist();
      } else {
        toast.error('Unable to remove stock. Please try again.');
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      toast.error('Unable to remove stock. Please check your connection.');
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

  const renderWatchlistItem = ({ item }) => {
    const priceChange = item.analyst_target 
      ? ((item.analyst_target - item.current_price) / item.current_price * 100)
      : null;

    return (
      <Card 
        variant="outlined" 
        style={styles.card}
        onPress={() => navigateToCompanyDetail(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.stockInfo}>
            <Text style={[styles.ticker, { color: theme.primary }]}>{item.ticker}</Text>
            <Text style={[styles.companyName, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.company_name || 'Company Name'}
            </Text>
            {item.sector && (
              <View style={[styles.sectorBadge, { backgroundColor: theme.primaryBackground }]}>
                <Text style={[styles.sectorText, { color: theme.primary }]}>{item.sector}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => removeFromWatchlist(item.id, item.ticker)}
            style={[styles.removeButton, { backgroundColor: theme.errorBackground }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>

        <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
          <View>
            <Text style={[styles.label, { color: theme.textTertiary }]}>CURRENT</Text>
            <Text style={[styles.price, { color: theme.textPrimary }]}>
              {item.current_price != null ? `₹${item.current_price.toFixed(2)}` : 'N/A'}
            </Text>
          </View>
          
          {item.analyst_target != null && (
            <View style={styles.targetSection}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>TARGET</Text>
              <Text style={[styles.target, { color: theme.success }]}>
                ₹{item.analyst_target.toFixed(2)}
              </Text>
              {priceChange != null && (
                <View style={[
                  styles.changeBadge,
                  { backgroundColor: priceChange > 0 ? theme.successBackground : theme.errorBackground }
                ]}>
                  <Ionicons 
                    name={priceChange > 0 ? "arrow-up" : "arrow-down"} 
                    size={12} 
                    color={priceChange > 0 ? theme.success : theme.error} 
                  />
                  <Text style={[
                    styles.changeText,
                    { color: priceChange > 0 ? theme.success : theme.error }
                  ]}>
                    {Math.abs(priceChange).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {item.next_earnings && (
          <View style={styles.earningsSection}>
            <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.earningsText, { color: theme.textSecondary }]}>
              Earnings: {new Date(item.next_earnings).toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.notes && (
          <View style={[styles.notesSection, { backgroundColor: theme.primaryBackground }]}>
            <Ionicons name="document-text-outline" size={14} color={theme.primary} />
            <Text style={[styles.notesText, { color: theme.primary }]}>{item.notes}</Text>
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return <LoadingOverlay message="Loading watchlist..." subMessage="Fetching your tracked stocks" />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Watchlist" />
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
        title="Watchlist"
        subtitle={`${watchlist.length} stocks tracked`}
        rightAction={{
          icon: addingStock ? "close" : "add",
          onPress: () => setAddingStock(!addingStock)
        }}
      />

      {addingStock && (
        <View style={[styles.addForm, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Stock Ticker (e.g., RELIANCE.NS)"
              placeholderTextColor={theme.placeholder}
              value={newTicker}
              onChangeText={setNewTicker}
              autoCapitalize="characters"
            />
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, styles.notesInput, { color: theme.textPrimary }]}
              placeholder="Notes (optional)"
              placeholderTextColor={theme.placeholder}
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
            />
          </View>
          <Button
            title="Add to Watchlist"
            onPress={addToWatchlist}
            icon="add-circle-outline"
            fullWidth
          />
        </View>
      )}

      <FlatList
        data={watchlist}
        renderItem={renderWatchlistItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <NoDataState
            title="No Stocks Yet"
            message="Add stocks to your watchlist to track their performance."
            icon="list-outline"
          />
        }
      />

      {/* Confirmation Banner */}
      {confirmDelete && (
        <View style={[styles.confirmBanner, { backgroundColor: theme.surface }]}>
          <Text style={[styles.confirmText, { color: theme.textPrimary }]}>
            Remove <Text style={{ fontWeight: '700', color: theme.primary }}>{confirmDelete.ticker}</Text> from watchlist?
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              style={[styles.confirmBtn, styles.cancelBtn, { borderColor: theme.border }]}
              onPress={() => setConfirmDelete(null)}
            >
              <Text style={[styles.confirmBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmBtn, styles.removeBtn, { backgroundColor: theme.error }]}
              onPress={confirmRemoveFromWatchlist}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={[styles.confirmBtnText, { color: '#fff', marginLeft: 4 }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addForm: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  inputIcon: {
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    paddingVertical: SPACING.sm,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: SPACING.md,
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
  sectorBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADIUS.xs,
    marginTop: SPACING.xs,
  },
  sectorText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  targetSection: {
    alignItems: 'flex-end',
  },
  label: {
    ...TYPOGRAPHY.label,
    marginBottom: 2,
  },
  price: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  target: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginTop: SPACING.xxs,
    gap: 2,
  },
  changeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  earningsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  earningsText: {
    ...TYPOGRAPHY.caption,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  notesText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
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
  // Confirmation banner styles
  confirmBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    ...SHADOWS.large,
  },
  confirmText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    minWidth: 100,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  removeBtn: {
  },
  confirmBtnText: {
    ...TYPOGRAPHY.button,
    fontWeight: '600',
  },
});
