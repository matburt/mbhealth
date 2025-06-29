import { 
  AnalysisConfig, 
  AnalysisCollection, 
  AnalysisConfigCreate, 
  AnalysisConfigUpdate,
  AnalysisCollectionCreate,
  AnalysisCollectionUpdate 
} from '../types/analysisConfig';

const STORAGE_KEYS = {
  CONFIGS: 'mbhealth_analysis_configs',
  COLLECTIONS: 'mbhealth_analysis_collections'
};

class AnalysisConfigService {
  // Analysis Configurations
  getConfigs(): AnalysisConfig[] {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIGS);
    return stored ? JSON.parse(stored) : [];
  }

  getConfig(id: string): AnalysisConfig | null {
    const configs = this.getConfigs();
    return configs.find(config => config.id === id) || null;
  }

  createConfig(data: AnalysisConfigCreate): AnalysisConfig {
    const configs = this.getConfigs();
    const newConfig: AnalysisConfig = {
      ...data,
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_favorite: false,
      usage_count: 0
    };
    
    configs.push(newConfig);
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(configs));
    return newConfig;
  }

  updateConfig(id: string, data: AnalysisConfigUpdate): AnalysisConfig | null {
    const configs = this.getConfigs();
    const index = configs.findIndex(config => config.id === id);
    
    if (index === -1) return null;
    
    configs[index] = {
      ...configs[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(configs));
    return configs[index];
  }

  deleteConfig(id: string): boolean {
    const configs = this.getConfigs();
    const filteredConfigs = configs.filter(config => config.id !== id);
    
    if (filteredConfigs.length === configs.length) return false;
    
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(filteredConfigs));
    return true;
  }

  toggleFavorite(id: string): AnalysisConfig | null {
    const config = this.getConfig(id);
    if (!config) return null;
    
    return this.updateConfig(id, { is_favorite: !config.is_favorite });
  }

  incrementUsage(id: string): AnalysisConfig | null {
    const config = this.getConfig(id);
    if (!config) return null;
    
    return this.updateConfig(id, { usage_count: config.usage_count + 1 });
  }

  getFavoriteConfigs(): AnalysisConfig[] {
    return this.getConfigs().filter(config => config.is_favorite);
  }

  getPopularConfigs(limit = 5): AnalysisConfig[] {
    return this.getConfigs()
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }

  // Analysis Collections
  getCollections(): AnalysisCollection[] {
    const stored = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    const collections = stored ? JSON.parse(stored) : [];
    
    // Add configs to collections
    const configs = this.getConfigs();
    return collections.map((collection: AnalysisCollection) => ({
      ...collection,
      configs: configs.filter(config => config.collection_id === collection.id)
    }));
  }

  getCollection(id: string): AnalysisCollection | null {
    const collections = this.getCollections();
    return collections.find(collection => collection.id === id) || null;
  }

  createCollection(data: AnalysisCollectionCreate): AnalysisCollection {
    const collections = this.getCollections();
    const newCollection: AnalysisCollection = {
      ...data,
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    collections.push(newCollection);
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections.map(c => ({ ...c, configs: undefined }))));
    return newCollection;
  }

  updateCollection(id: string, data: AnalysisCollectionUpdate): AnalysisCollection | null {
    const stored = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    const collections = stored ? JSON.parse(stored) : [];
    const index = collections.findIndex((collection: AnalysisCollection) => collection.id === id);
    
    if (index === -1) return null;
    
    collections[index] = {
      ...collections[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    return this.getCollection(id);
  }

  deleteCollection(id: string): boolean {
    const stored = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    const collections = stored ? JSON.parse(stored) : [];
    const filteredCollections = collections.filter((collection: AnalysisCollection) => collection.id !== id);
    
    if (filteredCollections.length === collections.length) return false;
    
    // Remove collection reference from configs
    const configs = this.getConfigs();
    const updatedConfigs = configs.map(config => 
      config.collection_id === id 
        ? { ...config, collection_id: undefined, updated_at: new Date().toISOString() }
        : config
    );
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(updatedConfigs));
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(filteredCollections));
    return true;
  }

  // Utility methods
  exportConfigs(): string {
    const data = {
      configs: this.getConfigs(),
      collections: this.getCollections().map(c => ({ ...c, configs: undefined })),
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  }

  importConfigs(jsonData: string): { success: boolean; message: string; imported: { configs: number; collections: number } } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.configs || !Array.isArray(data.configs)) {
        return { success: false, message: 'Invalid data format: missing configs array', imported: { configs: 0, collections: 0 } };
      }

      const existingConfigs = this.getConfigs();
      const existingCollections = this.getCollections();
      
      // Import collections first
      let importedCollections = 0;
      if (data.collections && Array.isArray(data.collections)) {
        data.collections.forEach((collection: any) => {
          // Generate new ID to avoid conflicts
          const newCollection = {
            ...collection,
            id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          existingCollections.push(newCollection);
          importedCollections++;
        });
      }

      // Import configs
      let importedConfigs = 0;
      data.configs.forEach((config: any) => {
        // Generate new ID to avoid conflicts
        const newConfig = {
          ...config,
          id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: 0 // Reset usage count for imported configs
        };
        existingConfigs.push(newConfig);
        importedConfigs++;
      });

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(existingConfigs));
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(existingCollections.map(c => ({ ...c, configs: undefined }))));

      return { 
        success: true, 
        message: `Successfully imported ${importedConfigs} configs and ${importedCollections} collections`, 
        imported: { configs: importedConfigs, collections: importedCollections } 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        imported: { configs: 0, collections: 0 } 
      };
    }
  }

  // Initialize with default collections
  initializeDefaults(): void {
    const collections = this.getCollections();
    if (collections.length === 0) {
      // Create default collections
      this.createCollection({
        name: 'Quick Analyses',
        description: 'Fast and common analysis configurations',
        color: '#3B82F6' // blue
      });
      
      this.createCollection({
        name: 'Health Monitoring',
        description: 'Regular health tracking analyses',
        color: '#10B981' // green
      });
      
      this.createCollection({
        name: 'Detailed Reviews',
        description: 'Comprehensive health analysis configurations',
        color: '#8B5CF6' // purple
      });
    }
  }
}

export const analysisConfigService = new AnalysisConfigService();