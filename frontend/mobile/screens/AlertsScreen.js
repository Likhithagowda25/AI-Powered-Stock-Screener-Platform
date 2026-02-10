import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../constants/colors';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import NoDataState from '../components/ui/NoDataState';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

import { API_BASE_URL } from '../services/api/config';

const API_BASE = API_BASE_URL;

const ALERT_TYPES = [
  {
    id: 'price_threshold',
    name: 'Price Threshold (Above/Below)',
    icon: 'trending-up',
    description: 'Alert when price crosses a limit'
  },
  {
    id: 'price_below_buy_price',
    name: 'Price Below Buy Price',
    icon: 'trending-down',
    description: 'Alert when price falls below your buy price'
  },
  // {
  //   id: 'price_vs_analyst',
  //   name: 'Price vs Analyst Target',
  //   icon: 'analytics',
  //   description: 'Alert when price is below analyst targets' 
  // }, // Hidden: No data
  {
    id: 'earnings_upcoming',
    name: 'Upcoming Earnings',
    icon: 'calendar',
    description: 'Alert before earnings announcement'
  },
  {
    id: 'buyback_announced',
    name: 'Buyback Announcement',
    icon: 'cart', 
    description: 'Alert when buyback is announced'
  },
  {
    id: 'fundamental_condition',
    name: 'Fundamental Condition',
    icon: 'bar-chart',
    description: 'Alert based on fundamental metrics'
  },
];

export default function AlertsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState('');
  const [activeTab, setActiveTab] = useState('alerts');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openPicker, setOpenPicker] = useState(null); // For dropdown pickers
  
  const [formData, setFormData] = useState({
    ticker: '',
    alert_name: '',
    frequency: 'daily',
    threshold_percent: '',
    days_before: '',
    days_lookback: '',
    comparison: 'below_low_target',
    fundamental_metric: 'pe_ratio',
    fundamental_operator: 'above',
    fundamental_value: ''
  });

  // Picker options
  const PICKER_OPTIONS = {
    comparison: ['below_low_target', 'below_avg_target'],
    fundamental_metric: ['pe_ratio', 'roe', 'debt_to_equity', 'eps_growth', 'revenue_growth'],
    fundamental_operator: ['above', 'below'],
    frequency: ['daily', 'weekly']
  };

  useEffect(() => {
    if (user?.userId) {
      fetchData();
    } else {
      setLoading(false);
      setError('Please log in to view your alerts.');
    }
  }, [user?.userId]);

  const fetchData = async () => {
    if (!user?.userId) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    setError(null);
    try {
      await Promise.all([fetchAlerts(), fetchNotifications()]);
    } catch (err) {
      // Error handled in individual fetch functions
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts?user_id=${user.userId}`);
      const data = await response.json();
      
      console.log('Alerts response:', data);
      
      if (data.success) {
        setAlerts(data.data || []);
      } else {
        setError('Unable to load alerts. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      if (err.message?.includes('Network') || err.message?.includes('timeout')) {
        setError('Network connection issue. Please check your internet and try again.');
      } else {
        setError('Something went wrong. Please try again later.');
      }
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications?user_id=${user.userId}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchData();
  };

  const openAlertModal = (type = '') => {
    setSelectedAlertType(type);
    setFormData({
      ticker: '',
      alert_name: '',
      frequency: 'daily',
      threshold_percent: '',
      days_before: '',
      days_lookback: '',
      comparison: 'below_low_target',
      fundamental_metric: 'pe_ratio',
      fundamental_operator: 'above',
      fundamental_value: ''
    });
    setModalVisible(true);
  };

  const createAlert = async () => {
    if (!formData.ticker.trim() || !formData.alert_name.trim()) {
      toast.warning('Please fill in the alert name and ticker.');
      return;
    }

    let conditionJson = {};

    switch (selectedAlertType) {
      case 'price_threshold':
        conditionJson = { 
          operator: formData.fundamental_operator === 'above' ? '>' : '<', 
          value: parseFloat(formData.fundamental_value) 
        };
        break;
      case 'price_below_buy_price':
        conditionJson = { threshold_percent: parseFloat(formData.threshold_percent) };
        break;
      case 'price_vs_analyst':
        conditionJson = { comparison: formData.comparison };
        break;
      case 'earnings_upcoming':
        conditionJson = { days_before: parseInt(formData.days_before) };
        break;
      case 'buyback_announced':
        conditionJson = { days_lookback: parseInt(formData.days_lookback) };
        break;
      case 'fundamental_condition':
        conditionJson = { 
          metric: formData.fundamental_metric,
          operator: formData.fundamental_operator,
          value: parseFloat(formData.fundamental_value)
        };
        break;
    }

    let tickerToSubmit = formData.ticker.toUpperCase().trim();
    if (!tickerToSubmit.includes('.')) {
      tickerToSubmit += '.NS';
    }

    try {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.userId,
          ticker: tickerToSubmit,
          alert_type: selectedAlertType,
          alert_name: formData.alert_name,
          condition_json: conditionJson,
          frequency: formData.frequency
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Alert created successfully!');
        setModalVisible(false);
        setSelectedAlertType('');
        setFormData({
          ticker: '',
          alert_name: '',
          frequency: 'daily',
          threshold_percent: '',
          days_before: '',
          days_lookback: '',
          comparison: 'below_low_target',
          fundamental_metric: 'pe_ratio',
          fundamental_operator: 'above',
          fundamental_value: ''
        });
        fetchAlerts();
      } else {
        toast.error(data.error || 'Could not create alert. Please try again.');
      }
    } catch (err) {
      console.error('Error creating alert:', err);
      toast.error('Unable to create alert. Please check your connection.');
    }
  };

  const toggleAlert = async (alertId, currentStatus) => {
    // Optimistic UI update - update local state immediately
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId ? { ...alert, is_active: !currentStatus } : alert
      )
    );

    try {
      const response = await fetch(
        `${API_BASE}/alerts/${alertId}?user_id=${user?.userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !currentStatus })
        }
      );

      const data = await response.json();

      if (!data.success) {
        // Revert on failure
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert.id === alertId ? { ...alert, is_active: currentStatus } : alert
          )
        );
        toast.error('Unable to update alert status.');
      }
    } catch (err) {
      console.error('Error toggling alert:', err);
      // Revert on error
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId ? { ...alert, is_active: currentStatus } : alert
        )
      );
      toast.error('Unable to update alert. Please check your connection.');
    }
  };

  const deleteAlert = async (alertId, name) => {
    setConfirmDelete({ id: alertId, name });
  };

  const confirmDeleteAlert = async () => {
    if (!confirmDelete) return;
    
    const { id: alertId } = confirmDelete;
    setConfirmDelete(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/alerts/${alertId}?user_id=${user?.userId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Alert deleted successfully');
        fetchAlerts();
      } else {
        toast.error('Unable to delete alert. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      toast.error('Failed to delete alert.');
    }
  };

  const deleteNotification = async (id) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    try {
      // Assuming backend endpoint exists or we just hide it locally
      await fetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    try {
      await fetch(`${API_BASE}/notifications/${id}/read?user_id=${user?.userId}`, {
        method: 'PATCH'
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const renderAlert = ({ item }) => {
    const alertType = ALERT_TYPES.find(t => t.id === item.alert_type);
    
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.alertInfo}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons 
                name={alertType?.icon || 'notifications'} 
                size={24} 
                color={theme.primary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertName, { color: theme.textPrimary }]}>{item.alert_name}</Text>
              <Text style={[styles.alertTicker, { color: theme.textSecondary }]}>{item.ticker || 'All Stocks'}</Text>
              <Text style={[styles.alertType, { color: theme.textTertiary }]}>{alertType?.name || item.alert_type}</Text>
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => toggleAlert(item.id, item.is_active)}
            trackColor={{ false: theme.border, true: theme.primary + '60' }}
            thumbColor={item.is_active ? theme.primary : theme.textTertiary}
          />
        </View>

        <View style={[styles.alertDetails, { borderTopColor: theme.border }]}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={theme.textTertiary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>Frequency: {item.frequency}</Text>
          </View>
          
          {item.last_triggered && (
            <View style={styles.detailRow}>
              <Ionicons name="notifications-outline" size={16} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                Last triggered: {new Date(item.last_triggered).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="stats-chart-outline" size={16} color={theme.textTertiary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              Triggered {item.trigger_count} time{item.trigger_count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => deleteAlert(item.id, item.alert_name)}
          style={[styles.deleteButton, { borderColor: theme.error }]}
        >
          <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Alert</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotification = ({ item }) => (
    <View 
      style={[
        styles.notificationCard, 
        { backgroundColor: theme.surface, borderColor: theme.border },
        !item.is_read && { borderLeftWidth: 4, borderLeftColor: theme.primary }
      ]}
    >
      <View style={styles.notificationHeader}>
        <Ionicons 
          name={item.notification_type === 'alert_triggered' ? "warning" : "notifications"} 
          size={20} 
          color={item.is_read ? theme.textTertiary : theme.primary} 
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.notificationTitle, { color: theme.textPrimary }]}>{item.title}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
            {new Date(item.triggered_at).toLocaleString()}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            {!item.is_read ? (
              <TouchableOpacity 
                style={[styles.markReadButton, { backgroundColor: theme.primary + '15' }]} 
                onPress={() => markAsRead(item.id)}
              >
                <Text style={[styles.markReadText, { color: theme.primary }]}>Mark as Read</Text>
              </TouchableOpacity>
            ) : (
               <View style={[styles.readBadge, { backgroundColor: theme.surface }]}>
                 <Ionicons name="checkmark-done" size={14} color={theme.textTertiary} />
                 <Text style={[styles.readText, { color: theme.textTertiary, marginLeft: 4 }]}>Read</Text>
               </View>
            )}

            <TouchableOpacity 
              style={{ marginLeft: 12, padding: 4 }} 
              onPress={() => deleteNotification(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={theme.error || '#FF4444'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Text style={[styles.notificationMessage, { color: theme.textSecondary, marginTop: 8 }]}>{item.message}</Text>
    </View>
  );

  const renderAlertTypeModal = () => (
    <Modal
      visible={modalVisible && !selectedAlertType}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
  
        <TouchableOpacity 
        style={[styles.modalOverlay, { backgroundColor: theme.backdropDim || 'rgba(0, 0, 0, 0.5)' }]}
        activeOpacity={1}
        onPress={() => setModalVisible(false)}
      >
        <TouchableOpacity style={[styles.modalContent, { backgroundColor: theme.surface }]} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Alert Type</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {ALERT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.alertTypeCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}
                onPress={() => setSelectedAlertType(type.id)}
              >
                <Ionicons name={type.icon} size={32} color={theme.primary} />
                <View style={styles.alertTypeInfo}>
                  <Text style={[styles.alertTypeName, { color: theme.textPrimary }]}>{type.name}</Text>
                  <Text style={[styles.alertTypeDesc, { color: theme.textSecondary }]}>{type.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  const renderAlertConfigModal = () => (
    <Modal
      visible={modalVisible && !!selectedAlertType}
      animationType="slide"
      transparent={true}
      onRequestClose={() => { setModalVisible(false); setSelectedAlertType(''); }}
    >
      <TouchableOpacity 
        style={[styles.modalOverlay, { backgroundColor: theme.backdropDim || 'rgba(0, 0, 0, 0.5)' }]}
        activeOpacity={1}
        onPress={() => { setModalVisible(false); setSelectedAlertType(''); }}
      >
        <TouchableOpacity style={[styles.modalContent, { backgroundColor: theme.surface }]} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setSelectedAlertType('');
                setFormData({
                  ticker: '',
                  alert_name: '',
                  frequency: 'daily',
                  threshold_percent: '',
                  days_before: '',
                  days_lookback: '',
                  comparison: 'below_low_target',
                  fundamental_metric: 'pe_ratio',
                  fundamental_operator: 'above',
                  fundamental_value: ''
                });
              }} 
              style={{ marginRight: SPACING.sm }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary, flex: 1 }]}>Create Alert</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedAlertType(''); }}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selected Alert Type Display */}
          <View style={[styles.selectedTypeCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
            <Ionicons name={ALERT_TYPES.find(t => t.id === selectedAlertType)?.icon || 'notifications'} size={24} color={theme.primary} />
            <Text style={[styles.selectedTypeName, { color: theme.primary }]}>
              {ALERT_TYPES.find(t => t.id === selectedAlertType)?.name || 'Alert'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Alert Name"
              placeholderTextColor={theme.placeholder}
              value={formData.alert_name}
              onChangeText={(text) => setFormData({ ...formData, alert_name: text })}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Stock Ticker (e.g., RELIANCE.NS)"
              placeholderTextColor={theme.placeholder}
              value={formData.ticker}
              onChangeText={(text) => setFormData({ ...formData, ticker: text })}
              autoCapitalize="characters"
            />

            {selectedAlertType === 'price_below_buy_price' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Threshold Percent (e.g., 10)"
                placeholderTextColor={theme.placeholder}
                value={formData.threshold_percent}
                onChangeText={(text) => setFormData({ ...formData, threshold_percent: text })}
                keyboardType="numeric"
              />
            )}

            {selectedAlertType === 'price_threshold' && (
              <>
                <View style={[styles.pickerContainer, openPicker === 'operator' && { zIndex: 1000 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Condition:</Text>
                    <TouchableOpacity
                      style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setOpenPicker(openPicker === 'operator' ? null : 'operator')}
                    >
                      <Text style={{ color: theme.textPrimary }}>
                         {formData.fundamental_operator === 'above' ? 'Price Above' : 'Price Below'}
                      </Text>
                      <Ionicons name={openPicker === 'operator' ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {openPicker === 'operator' && (
                      <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {['above', 'below'].map(opt => (
                          <TouchableOpacity 
                            key={opt}
                            style={[styles.dropdownItem, formData.fundamental_operator === opt && { backgroundColor: theme.primary + '20' }]}
                            onPress={() => { setFormData({ ...formData, fundamental_operator: opt }); setOpenPicker(null); }}
                          >
                            <Text style={{ color: formData.fundamental_operator === opt ? theme.primary : theme.textPrimary }}> {opt === 'above' ? 'Price Above' : 'Price Below'} </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                </View>

                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Price Value (e.g., 2500)"
                  placeholderTextColor={theme.placeholder}
                  value={formData.fundamental_value}
                  onChangeText={(text) => setFormData({ ...formData, fundamental_value: text })}
                  keyboardType="numeric"
                />
              </>
            )}

            {selectedAlertType === 'price_vs_analyst' && (
              <View style={[styles.pickerContainer, openPicker === 'comparison' && { zIndex: 1000 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Comparison Type:</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => setOpenPicker(openPicker === 'comparison' ? null : 'comparison')}
                >
                  <Text style={{ color: theme.textPrimary }}>{formData.comparison.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Ionicons name={openPicker === 'comparison' ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                {openPicker === 'comparison' && (
                  <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {PICKER_OPTIONS.comparison.map(opt => (
                      <TouchableOpacity 
                        key={opt}
                        style={[styles.dropdownItem, formData.comparison === opt && { backgroundColor: theme.primary + '20' }]}
                        onPress={() => { setFormData({ ...formData, comparison: opt }); setOpenPicker(null); }}
                      >
                        <Text style={{ color: formData.comparison === opt ? theme.primary : theme.textPrimary }}>
                          {opt.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {selectedAlertType === 'earnings_upcoming' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Days Before Earnings (e.g., 30)"
                placeholderTextColor={theme.placeholder}
                value={formData.days_before}
                onChangeText={(text) => setFormData({ ...formData, days_before: text })}
                keyboardType="numeric"
              />
            )}

            {selectedAlertType === 'buyback_announced' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Days Lookback (e.g., 90)"
                placeholderTextColor={theme.placeholder}
                value={formData.days_lookback}
                onChangeText={(text) => setFormData({ ...formData, days_lookback: text })}
                keyboardType="numeric"
              />
            )}

            {selectedAlertType === 'fundamental_condition' && (
              <View>
                <View style={[styles.pickerContainer, openPicker === 'fundamental_metric' && { zIndex: 2000 }]}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Metric:</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setOpenPicker(openPicker === 'fundamental_metric' ? null : 'fundamental_metric')}
                  >
                    <Text style={{ color: theme.textPrimary }}>{formData.fundamental_metric.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Ionicons name={openPicker === 'fundamental_metric' ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {openPicker === 'fundamental_metric' && (
                    <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      {PICKER_OPTIONS.fundamental_metric.map(opt => (
                        <TouchableOpacity 
                          key={opt}
                          style={[styles.dropdownItem, formData.fundamental_metric === opt && { backgroundColor: theme.primary + '20' }]}
                          onPress={() => { setFormData({ ...formData, fundamental_metric: opt }); setOpenPicker(null); }}
                        >
                          <Text style={{ color: formData.fundamental_metric === opt ? theme.primary : theme.textPrimary }}>
                            {opt.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={[styles.pickerContainer, openPicker === 'fundamental_operator' && { zIndex: 1000 }]}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Condition:</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setOpenPicker(openPicker === 'fundamental_operator' ? null : 'fundamental_operator')}
                  >
                    <Text style={{ color: theme.textPrimary }}>{formData.fundamental_operator.toUpperCase()}</Text>
                    <Ionicons name={openPicker === 'fundamental_operator' ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {openPicker === 'fundamental_operator' && (
                    <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      {PICKER_OPTIONS.fundamental_operator.map(opt => (
                        <TouchableOpacity 
                          key={opt}
                          style={[styles.dropdownItem, formData.fundamental_operator === opt && { backgroundColor: theme.primary + '20' }]}
                          onPress={() => { setFormData({ ...formData, fundamental_operator: opt }); setOpenPicker(null); }}
                        >
                          <Text style={{ color: formData.fundamental_operator === opt ? theme.primary : theme.textPrimary }}>
                            {opt.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Value (e.g., 25)"
                  placeholderTextColor={theme.placeholder}
                  value={formData.fundamental_value}
                  onChangeText={(text) => setFormData({ ...formData, fundamental_value: text })}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={[styles.pickerContainer, openPicker === 'frequency' && { zIndex: 1000 }]}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Frequency:</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setOpenPicker(openPicker === 'frequency' ? null : 'frequency')}
              >
                <Text style={{ color: theme.textPrimary }}>{formData.frequency.toUpperCase()}</Text>
                <Ionicons name={openPicker === 'frequency' ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
              </TouchableOpacity>
              {openPicker === 'frequency' && (
                <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {PICKER_OPTIONS.frequency.map(opt => (
                    <TouchableOpacity 
                      key={opt}
                      style={[styles.dropdownItem, formData.frequency === opt && { backgroundColor: theme.primary + '20' }]}
                      onPress={() => { setFormData({ ...formData, frequency: opt }); setOpenPicker(null); }}
                    >
                      <Text style={{ color: formData.frequency === opt ? theme.primary : theme.textPrimary }}>
                        {opt.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={createAlert}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // Loading state
  if (loading) {
    return <LoadingOverlay message="Loading alerts..." subMessage="Fetching your alert configurations" />;
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Alerts & Notifications" />
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconCircle, { backgroundColor: theme.error + '20' }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Unable to Load</Text>
          <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{error}</Text>
          <Button
            variant="primary"
            onPress={handleRetry}
            icon="refresh-outline"
          >
            Try Again
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader 
        title="Alerts & Notifications" 
        rightAction={{
          icon: 'add',
          onPress: () => openAlertModal()
        }}
      />

      {/* Confirmation Banner for Deleting Alerts */}
      {confirmDelete && (
        <View style={[styles.confirmBanner, { backgroundColor: theme.errorBackground || theme.error + '15', borderColor: theme.error }]}>
          <Text style={[styles.confirmText, { color: theme.textPrimary }]}>
            Delete "<Text style={{ fontWeight: '700' }}>{confirmDelete.name}</Text>"?
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              onPress={() => setConfirmDelete(null)}
              style={[styles.confirmButton, styles.cancelConfirmButton, { borderColor: theme.border }]}
            >
              <Text style={[styles.cancelConfirmText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={confirmDeleteAlert}
              style={[styles.confirmButton, styles.deleteConfirmButton, { backgroundColor: theme.error }]}
            >
              <Text style={styles.deleteConfirmText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.tabs, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'alerts' ? theme.primary : theme.textTertiary }]}>
            Alerts ({alerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'notifications' ? theme.primary : theme.textTertiary }]}>
            Notifications ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'alerts' ? (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id.toString()}
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
              title="No Alerts Configured"
              message="Create alerts to get notified about important stock events and price changes."
              icon="notifications-off-outline"
            />
          }
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
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
              title="No Notifications"
              message="When your alerts are triggered, notifications will appear here."
              icon="mail-open-outline"
            />
          }
        />
      )}

      {renderAlertTypeModal()}
      {renderAlertConfigModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabText: {
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
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  alertName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  alertTicker: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
  alertType: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  alertDetails: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  detailText: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACING.xs,
  },
  deleteButton: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteButtonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  notificationCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginLeft: SPACING.xs,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    ...TYPOGRAPHY.bodySmall,
    marginBottom: SPACING.xs,
  },
  notificationTime: {
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
    maxHeight: '90%',
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
  alertTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  alertTypeInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  alertTypeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  alertTypeDesc: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  selectedTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  selectedTypeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: SPACING.sm,
    position: 'relative',
    zIndex: 1,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    marginBottom: SPACING.xs,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginTop: 4,
    zIndex: 100,
    ...SHADOWS.medium,
  },
  dropdownItem: {
    padding: SPACING.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  submitButton: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  cancelConfirmButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelConfirmText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  deleteConfirmText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markReadButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markReadText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  readBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  readText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
});
