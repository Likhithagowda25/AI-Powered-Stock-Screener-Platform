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
  Modal,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Align with backend API gateway and other mobile screens
const API_BASE = 'http://localhost:8080/api/v1';
const USER_ID = 1; // TODO: Get from auth context / real user

interface Alert {
  id: number;
  ticker: string;
  company_name: string;
  alert_type: string;
  alert_name: string;
  condition_json: any;
  is_active: boolean;
  frequency: string;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
}

const ALERT_TYPES = [
  {
    id: 'price_below_buy_price',
    name: 'Price Below Buy Price',
    icon: 'trending-down',
    description: 'Alert when price falls below your buy price'
  },
  {
    id: 'price_vs_analyst',
    name: 'Price vs Analyst Target',
    icon: 'analytics',
    description: 'Alert when price is below analyst targets'
  },
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications'>('alerts');
  
  const [formData, setFormData] = useState({
    ticker: '',
    alert_name: '',
    frequency: 'daily',
    threshold_percent: '10',
    days_before: '30',
    days_lookback: '90',
    comparison: 'below_low_target'
  });

  useEffect(() => {
    fetchAlerts();
    fetchNotifications();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts?user_id=${USER_ID}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      Alert.alert('Error', 'Failed to fetch alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications?user_id=${USER_ID}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
    fetchNotifications();
  };

  const openAlertModal = (type: string) => {
    setSelectedAlertType(type);
    setFormData({
      ticker: '',
      alert_name: '',
      frequency: 'daily',
      threshold_percent: '10',
      days_before: '30',
      days_lookback: '90',
      comparison: 'below_low_target'
    });
    setModalVisible(true);
  };

  const createAlert = async () => {
    if (!formData.ticker.trim() || !formData.alert_name.trim()) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    let conditionJson = {};

    switch (selectedAlertType) {
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
    }

    try {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          ticker: formData.ticker.toUpperCase(),
          alert_type: selectedAlertType,
          alert_name: formData.alert_name,
          condition_json: conditionJson,
          frequency: formData.frequency
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Alert created successfully');
        setModalVisible(false);
        fetchAlerts();
      } else {
        Alert.alert('Error', data.error || 'Failed to create alert');
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      Alert.alert('Error', 'Failed to create alert');
    }
  };

  const toggleAlert = async (alertId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `${API_BASE}/alerts/${alertId}?user_id=${USER_ID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !currentStatus })
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
      } else {
        Alert.alert('Error', 'Failed to update alert');
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
      Alert.alert('Error', 'Failed to update alert');
    }
  };

  const deleteAlert = async (alertId: number, name: string) => {
    Alert.alert(
      'Delete Alert',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE}/alerts/${alertId}?user_id=${USER_ID}`,
                { method: 'DELETE' }
              );

              const data = await response.json();

              if (data.success) {
                fetchAlerts();
              } else {
                Alert.alert('Error', 'Failed to delete alert');
              }
            } catch (error) {
              console.error('Error deleting alert:', error);
              Alert.alert('Error', 'Failed to delete alert');
            }
          }
        }
      ]
    );
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}/read?user_id=${USER_ID}`, {
        method: 'PATCH'
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => {
    const alertType = ALERT_TYPES.find(t => t.id === item.alert_type);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.alertInfo}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={(alertType?.icon || 'notifications') as any} 
                size={24} 
                color="#3b82f6" 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertName}>{item.alert_name}</Text>
              <Text style={styles.alertTicker}>{item.ticker || 'All Stocks'}</Text>
              <Text style={styles.alertType}>{alertType?.name || item.alert_type}</Text>
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => toggleAlert(item.id, item.is_active)}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={item.is_active ? '#3b82f6' : '#f3f4f6'}
          />
        </View>

        <View style={styles.alertDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Frequency: {item.frequency}</Text>
          </View>
          
          {item.last_triggered && (
            <View style={styles.detailRow}>
              <Ionicons name="notifications-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>
                Last triggered: {new Date(item.last_triggered).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="stats-chart-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              Triggered {item.trigger_count} time{item.trigger_count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => deleteAlert(item.id, item.alert_name)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Delete Alert</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotification = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.unreadNotification]}
      onPress={() => !item.is_read && markAsRead(item.id)}
    >
      <View style={styles.notificationHeader}>
        <Ionicons 
          name="notifications" 
          size={20} 
          color={item.is_read ? '#9ca3af' : '#3b82f6'} 
        />
        <Text style={styles.notificationTitle}>{item.title}</Text>
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTime}>
        {new Date(item.triggered_at).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  const renderAlertTypeModal = () => (
    <Modal
      visible={modalVisible && !selectedAlertType}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Alert Type</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {ALERT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.alertTypeCard}
                onPress={() => openAlertModal(type.id)}
              >
                <Ionicons name={type.icon as any} size={32} color="#3b82f6" />
                <View style={styles.alertTypeInfo}>
                  <Text style={styles.alertTypeName}>{type.name}</Text>
                  <Text style={styles.alertTypeDesc}>{type.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAlertConfigModal = () => (
    <Modal
      visible={modalVisible && !!selectedAlertType}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Alert</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <TextInput
              style={styles.input}
              placeholder="Alert Name"
              value={formData.alert_name}
              onChangeText={(text) => setFormData({ ...formData, alert_name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Stock Ticker (e.g., RELIANCE.NS)"
              value={formData.ticker}
              onChangeText={(text) => setFormData({ ...formData, ticker: text })}
              autoCapitalize="characters"
            />

            {selectedAlertType === 'price_below_buy_price' && (
              <TextInput
                style={styles.input}
                placeholder="Threshold Percent (e.g., 10)"
                value={formData.threshold_percent}
                onChangeText={(text) => setFormData({ ...formData, threshold_percent: text })}
                keyboardType="numeric"
              />
            )}

            {selectedAlertType === 'price_vs_analyst' && (
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Comparison Type:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    const options = ['below_low_target', 'below_avg_target'];
                    Alert.alert(
                      'Select Comparison',
                      '',
                      options.map(opt => ({
                        text: opt.replace(/_/g, ' ').toUpperCase(),
                        onPress: () => setFormData({ ...formData, comparison: opt })
                      }))
                    );
                  }}
                >
                  <Text>{formData.comparison.replace(/_/g, ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedAlertType === 'earnings_upcoming' && (
              <TextInput
                style={styles.input}
                placeholder="Days Before Earnings (e.g., 30)"
                value={formData.days_before}
                onChangeText={(text) => setFormData({ ...formData, days_before: text })}
                keyboardType="numeric"
              />
            )}

            {selectedAlertType === 'buyback_announced' && (
              <TextInput
                style={styles.input}
                placeholder="Days Lookback (e.g., 90)"
                value={formData.days_lookback}
                onChangeText={(text) => setFormData({ ...formData, days_lookback: text })}
                keyboardType="numeric"
              />
            )}

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Frequency:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  Alert.alert(
                    'Select Frequency',
                    '',
                    [
                      { text: 'Daily', onPress: () => setFormData({ ...formData, frequency: 'daily' }) },
                      { text: 'Weekly', onPress: () => setFormData({ ...formData, frequency: 'weekly' }) },
                    ]
                  );
                }}
              >
                <Text>{formData.frequency.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={createAlert} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts & Notifications</Text>
        <TouchableOpacity 
          onPress={() => setModalVisible(true)} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
            Alerts ({alerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications ({notifications.length})
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No alerts configured</Text>
              <Text style={styles.emptySubtext}>Create alerts to get notified</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No notifications</Text>
              <Text style={styles.emptySubtext}>Notifications will appear here</Text>
            </View>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
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
    alignItems: 'center',
    marginBottom: 12,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  alertTicker: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  alertType: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  alertDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  deleteButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
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
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
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
    maxHeight: '90%',
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
  alertTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  alertTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  alertTypeDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
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
