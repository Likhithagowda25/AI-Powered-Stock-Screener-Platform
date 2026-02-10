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

const API_BASE = 'http://localhost:8080/api/v1';
const USER_ID = '00000000-0000-0000-0000-000000000001';

interface Watchlist {
  watchlist_id: string;
  name: string;
  description: string;
  total_items: number;
}

interface WatchlistItem {
  item_id: string;
  ticker: string;
  added_price: number;
  target_price: number;
  notes: string;
  created_at: string;
}

export default function WatchlistScreen() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchWatchlists();
  }, []);

  useEffect(() => {
    if (selectedWatchlist) {
      fetchWatchlistItems(selectedWatchlist.watchlist_id);
    }
  }, [selectedWatchlist]);

  const fetchWatchlists = async () => {
    try {
      const response = await fetch(`${API_BASE}/watchlists`, {
        headers: { 'x-user-id': USER_ID }
      });
      const data = await response.json();
      
      if (data.success) {
        setWatchlists(data.data);
        if (data.data.length > 0 && !selectedWatchlist) {
          setSelectedWatchlist(data.data[0]);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to load watchlists');
      }
    } catch (error) {
      console.error('Error fetching watchlists:', error);
      Alert.alert('Error', 'Unable to load watchlists. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWatchlistItems = async (watchlistId: string) => {
    try {
      const response = await fetch(`${API_BASE}/watchlists/${watchlistId}/items`, {
        headers: { 'x-user-id': USER_ID }
      });
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const addStock = async () => {
    if (!newTicker.trim()) {
      Alert.alert('Error', 'Please enter a stock ticker');
      return;
    }

    if (!selectedWatchlist) {
      Alert.alert('Error', 'Please select a watchlist first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/watchlists/${selectedWatchlist.watchlist_id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({
          ticker: newTicker.toUpperCase(),
          target_price: targetPrice ? parseFloat(targetPrice) : null,
          notes: notes
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Stock added to watchlist');
        setShowAddStock(false);
        setNewTicker('');
        setTargetPrice('');
        setNotes('');
        fetchWatchlistItems(selectedWatchlist.watchlist_id);
      } else {
        Alert.alert('Error', data.message || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      Alert.alert('Error', 'Failed to add stock');
    }
  };

  const removeStock = async (itemId: string, ticker: string) => {
    if (!selectedWatchlist) return;

    Alert.alert(
      'Remove Stock',
      `Remove ${ticker} from watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE}/watchlists/${selectedWatchlist.watchlist_id}/items/${itemId}`,
                {
                  method: 'DELETE',
                  headers: { 'x-user-id': USER_ID }
                }
              );

              const data = await response.json();
              if (data.success) {
                fetchWatchlistItems(selectedWatchlist.watchlist_id);
              }
            } catch (error) {
              console.error('Error removing stock:', error);
              Alert.alert('Error', 'Failed to remove stock');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: WatchlistItem }) => {
    const hasTarget = item.target_price && item.added_price;
    const priceChange = hasTarget 
      ? ((item.target_price - item.added_price) / item.added_price * 100)
      : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.tickerSection}>
            <Text style={styles.ticker}>{item.ticker}</Text>
            <Text style={styles.date}>
              Added {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeStock(item.item_id, item.ticker)}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {hasTarget && (
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Added At</Text>
              <Text style={styles.priceValue}>₹{item.added_price.toFixed(2)}</Text>
            </View>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={20} color="#6b7280" />
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Target</Text>
              <Text style={[styles.priceValue, styles.targetPrice]}>
                ₹{item.target_price.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.badge, priceChange > 0 ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.badgeText}>
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        {item.notes && (
          <View style={styles.notesBox}>
            <Ionicons name="document-text-outline" size={14} color="#92400e" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading watchlists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Watchlist</Text>
          {selectedWatchlist && (
            <Text style={styles.headerSubtitle}>
              {selectedWatchlist.name} • {items.length} stocks
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowAddStock(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.item_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchWatchlists} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No stocks in watchlist</Text>
            <Text style={styles.emptySubtext}>Tap + to add stocks</Text>
          </View>
        }
      />

      <Modal visible={showAddStock} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stock</Text>
              <TouchableOpacity onPress={() => setShowAddStock(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Stock Ticker (e.g., RELIANCE)"
              value={newTicker}
              onChangeText={setNewTicker}
              autoCapitalize="characters"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.input}
              placeholder="Target Price (optional)"
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="decimal-pad"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity onPress={addStock} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Add to Watchlist</Text>
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
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tickerSection: {
    flex: 1,
  },
  ticker: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceBox: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  targetPrice: {
    color: '#10b981',
  },
  arrow: {
    marginHorizontal: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeGreen: {
    backgroundColor: '#d1fae5',
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
