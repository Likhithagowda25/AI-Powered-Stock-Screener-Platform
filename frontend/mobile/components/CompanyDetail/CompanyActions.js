import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/colors';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

import { API_BASE_URL } from '../../services/api/config';

const API_BASE = API_BASE_URL;

/**
 * CompanyActions - Action buttons for Watchlist, Portfolio, Share
 */
export default function CompanyActions({ 
  ticker, 
  companyName,
  currentPrice,
  onWatchlistAdd,
  onPortfolioAdd,
  isInWatchlist = false,
  isInPortfolio = false,
  navigateAfterAdd = true  // Navigate to Portfolio/Watchlist after adding
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const navigation = useNavigation();
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [addingToPortfolio, setAddingToPortfolio] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [quantity, setQuantity] = useState('1');

  const handleAddToWatchlist = async () => {
    if (!user?.userId) {
      toast.warning('Please log in to add stocks to your watchlist.');
      return;
    }

    if (isInWatchlist) {
      toast.info(`${ticker} is already in your Watchlist`);
      return;
    }

    setAddingToWatchlist(true);
    try {
      // Normalize ticker
      let tickerToAdd = ticker.toUpperCase().trim();
      if (!tickerToAdd.includes('.')) {
        tickerToAdd = tickerToAdd + '.NS';
      }

      // First get the user's default watchlist
      const watchlistsResponse = await fetch(`${API_BASE}/watchlists?user_id=${user.userId}`, {
        headers: { 'x-user-id': user.userId }
      });
      const watchlistsData = await watchlistsResponse.json();
      
      let watchlistId;
      
      if (watchlistsData.success && watchlistsData.data && watchlistsData.data.length > 0) {
        // Use the default watchlist (first one)
        watchlistId = watchlistsData.data[0].watchlist_id;
      } else {
        // Create a default watchlist if none exists
        const createResponse = await fetch(`${API_BASE}/watchlists`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.userId
          },
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

      // Add the stock to the watchlist
      const response = await fetch(`${API_BASE}/watchlists/${watchlistId}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.userId
        },
        body: JSON.stringify({
          user_id: user.userId,
          ticker: tickerToAdd,
          notes: `Added from Company Detail on ${new Date().toLocaleDateString()}`
        })
      });

      const data = await response.json();

      if (data.success) {
        // Check if already existed or newly added
        if (data.data?.action === 'already_exists') {
          toast.info(data.message || `${ticker} is already in your Watchlist`);
        } else {
          toast.success(data.message || 'Added to Watchlist');
          
          // Navigate to Watchlist tab after a short delay to show toast
          if (navigateAfterAdd) {
            setTimeout(() => {
              navigation.navigate('Watchlist');
            }, 800);
          }
        }
        onWatchlistAdd?.();
      } else {
        toast.error(data.error || 'Could not add to watchlist. Please try again.');
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      toast.error('Unable to add to watchlist. Please check your connection.');
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleAddToPortfolio = () => {
    if (!user?.userId) {
      toast.warning('Please log in to add stocks to your portfolio.');
      return;
    }
    setModalVisible(true);
  };

  const confirmAddToPortfolio = async () => {
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      toast.warning('Please enter a valid number of shares.');
      return;
    }

    setAddingToPortfolio(true);
    setModalVisible(false);
    try {
      // Normalize ticker
      let tickerToAdd = ticker.toUpperCase().trim();
      if (!tickerToAdd.includes('.')) {
        tickerToAdd = tickerToAdd + '.NS';
      }

      // First get the user's default portfolio
      const portfoliosResponse = await fetch(`${API_BASE}/portfolios?user_id=${user.userId}`, {
        headers: { 'x-user-id': user.userId }
      });
      const portfoliosData = await portfoliosResponse.json();
      
      let portfolioId;
      
      if (portfoliosData.success && portfoliosData.data && portfoliosData.data.length > 0) {
        // Use the default portfolio (first one)
        portfolioId = portfoliosData.data[0].portfolio_id;
      } else {
        // Create a default portfolio if none exists
        const createResponse = await fetch(`${API_BASE}/portfolios`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.userId
          },
          body: JSON.stringify({
            user_id: user.userId,
            name: 'My Portfolio',
            description: 'Default portfolio',
            is_default: true,
            currency: 'INR'
          })
        });
        const createData = await createResponse.json();
        if (createData.success) {
          portfolioId = createData.data.portfolio_id;
        } else {
          throw new Error('Could not create portfolio');
        }
      }

      // Add the holding to the portfolio
      const response = await fetch(`${API_BASE}/portfolios/${portfolioId}/holdings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.userId
        },
        body: JSON.stringify({
          user_id: user.userId,
          ticker: tickerToAdd,
          quantity: Number(quantity),
          average_buy_price: currentPrice || 0,
          notes: `Added from Company Detail on ${new Date().toLocaleDateString()}`
        })
      });

      const data = await response.json();

      if (data.success) {
        // Check if it was aggregated with existing holding or newly added
        if (data.data?.action === 'updated') {
          toast.success(data.message || `Updated: Total ${data.data.quantity} shares`);
        } else {
          toast.success(data.message || `Added ${quantity} shares to Portfolio`);
        }
        onPortfolioAdd?.();
        
        // Navigate to Portfolio tab after a short delay to show toast
        if (navigateAfterAdd) {
          setTimeout(() => {
            navigation.navigate('Portfolio');
          }, 800);
        }
      } else {
        toast.error(data.error || data.message || 'Could not add to portfolio. Please try again.');
      }
    } catch (err) {
      console.error('Error adding to portfolio:', err);
      toast.error('Unable to add to portfolio. Please check your connection.');
    } finally {
      setAddingToPortfolio(false);
    }
  };

  const handleShare = async () => {
    try {
      const message = `Check out ${companyName || ticker} (${ticker})${currentPrice ? ` - Current Price: ₹${currentPrice.toFixed(2)}` : ''}`;
      
      await Share.share({
        message: message,
        title: `${ticker} Stock Details`,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Actions</Text>
      
      <View style={styles.buttonsRow}>
        {/* Add to Watchlist */}
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { 
              backgroundColor: isInWatchlist ? theme.primary : theme.background,
              borderColor: theme.primary 
            }
          ]}
          onPress={handleAddToWatchlist}
          disabled={addingToWatchlist}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isInWatchlist ? 'eye' : 'eye-outline'} 
            size={20} 
            color={isInWatchlist ? '#fff' : theme.primary} 
          />
          <Text style={[
            styles.buttonText, 
            { color: isInWatchlist ? '#fff' : theme.primary }
          ]}>
            {isInWatchlist ? 'Watching' : 'Watchlist'}
          </Text>
        </TouchableOpacity>

        {/* Add to Portfolio */}
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { 
              backgroundColor: isInPortfolio ? theme.success : theme.background,
              borderColor: theme.success 
            }
          ]}
          onPress={handleAddToPortfolio}
          disabled={addingToPortfolio}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isInPortfolio ? 'briefcase' : 'briefcase-outline'} 
            size={20} 
            color={isInPortfolio ? '#fff' : theme.success} 
          />
          <Text style={[
            styles.buttonText, 
            { color: isInPortfolio ? '#fff' : theme.success }
          ]}>
            {isInPortfolio ? 'In Portfolio' : 'Buy'}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.textSecondary }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.buttonText, { color: theme.textSecondary }]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Portfolio Modal */}
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
                Add to Portfolio
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
                Ticker: <Text style={{ color: theme.primary, fontWeight: '700' }}>{ticker}</Text>
              </Text>
              
              <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: SPACING.sm }]}>
                Current Price: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>₹{currentPrice?.toFixed(2) || '0.00'}</Text>
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Number of Shares</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Enter quantity"
                  placeholderTextColor={theme.placeholder}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  autoFocus={true}
                />
              </View>

              <Button
                title="Add to Portfolio"
                onPress={confirmAddToPortfolio}
                fullWidth
                loading={addingToPortfolio}
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
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  title: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  buttonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
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
  modalLabel: {
    ...TYPOGRAPHY.body,
    marginBottom: 4,
  },
  inputContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    fontSize: 18,
  },
  modalSubmitButton: {
    marginTop: SPACING.sm,
  },
});
