import React, { createContext, useContext, useState, useCallback } from 'react';

const SavedResultsContext = createContext(undefined);

export function SavedResultsProvider({ children }) {
  const [savedResults, setSavedResults] = useState([]);
  const [maxSaved] = useState(10); // Maximum number of saved results

  /**
   * Save a screener result
   * 
   * @param {Object} params - Save parameters
   * @param {string} params.name - Name for the saved result
   * @param {string} params.query - Original query
   * @param {Array} params.results - Stock results array
   * @param {Object} params.matchedConditions - Matched conditions map
   * @param {Object} params.metadata - Additional metadata
   * @returns {string} ID of the saved result
   */
  const saveResult = useCallback(({ name, query, results, matchedConditions = {}, metadata = {} }) => {
    const id = `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSavedResult = {
      id,
      name: name || `Results from ${new Date().toLocaleDateString()}`,
      query,
      results,
      matchedConditions,
      savedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        count: results?.length || 0,
      },
    };

    setSavedResults(prev => {
      const updated = [newSavedResult, ...prev];
      // Keep only the latest maxSaved results
      if (updated.length > maxSaved) {
        return updated.slice(0, maxSaved);
      }
      return updated;
    });

    return id;
  }, [maxSaved]);

  /**
   * Remove a saved result
   * 
   * @param {string} id - ID of the saved result to remove
   */
  const removeSavedResult = useCallback((id) => {
    setSavedResults(prev => prev.filter(item => item.id !== id));
  }, []);

  /**
   * Get a saved result by ID
   * 
   * @param {string} id - ID of the saved result
   * @returns {Object|undefined} The saved result or undefined
   */
  const getSavedResult = useCallback((id) => {
    return savedResults.find(item => item.id === id);
  }, [savedResults]);

  /**
   * Clear all saved results
   */
  const clearAllSaved = useCallback(() => {
    setSavedResults([]);
  }, []);

  /**
   * Update a saved result's name
   * 
   * @param {string} id - ID of the saved result
   * @param {string} newName - New name for the result
   */
  const renameSavedResult = useCallback((id, newName) => {
    setSavedResults(prev => prev.map(item => 
      item.id === id ? { ...item, name: newName } : item
    ));
  }, []);

  const value = {
    savedResults,
    saveResult,
    removeSavedResult,
    getSavedResult,
    clearAllSaved,
    renameSavedResult,
    hasSavedResults: savedResults.length > 0,
    savedCount: savedResults.length,
    maxSaved,
  };

  return (
    <SavedResultsContext.Provider value={value}>
      {children}
    </SavedResultsContext.Provider>
  );
}

/**
 * Hook to access saved results context
 * 
 * @returns {Object} Saved results context value
 * @throws {Error} If used outside of SavedResultsProvider
 */
export function useSavedResults() {
  const context = useContext(SavedResultsContext);
  if (context === undefined) {
    throw new Error('useSavedResults must be used within a SavedResultsProvider');
  }
  return context;
}

export default { SavedResultsProvider, useSavedResults };
