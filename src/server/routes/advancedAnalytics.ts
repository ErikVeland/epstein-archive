import express from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { AdvancedAnalyticsService } from '../services/AdvancedAnalyticsService.js';
import { VisualizationService } from '../services/VisualizationService.js';
import { PredictiveAnalyticsService } from '../services/PredictiveAnalyticsService.js';

const router = express.Router();
const advancedAnalyticsService = new AdvancedAnalyticsService();
const visualizationService = new VisualizationService();
const predictiveAnalyticsService = new PredictiveAnalyticsService();

// Pattern Recognition Routes
router.get('/patterns', authenticateRequest, async (req, res, next) => {
  try {
    const searchTerm = req.query.search as string;
    const patterns = await advancedAnalyticsService.detectPatterns(searchTerm);
    res.json(patterns);
  } catch (error) {
    next(error);
  }
});

// Timeline Reconstruction Routes
router.get('/timeline', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
    const searchTerm = req.query.search as string;
    const timeline = await advancedAnalyticsService.reconstructTimeline(entityId, searchTerm);
    res.json(timeline);
  } catch (error) {
    next(error);
  }
});

// Anomaly Detection Routes
router.get('/anomalies', authenticateRequest, async (_req, res, next) => {
  try {
    const anomalies = await advancedAnalyticsService.detectAnomalies();
    res.json(anomalies);
  } catch (error) {
    next(error);
  }
});

// Risk Assessment Routes
router.get('/risk-assessment', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
    const riskAssessments = await advancedAnalyticsService.assessRisk(entityId);
    res.json(riskAssessments);
  } catch (error) {
    next(error);
  }
});

// Entity Relationship Mapping Routes
router.get('/relationships', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
    const depth = req.query.depth ? parseInt(req.query.depth as string) : 2;
    const relationships = await advancedAnalyticsService.mapEntityRelationships(entityId, depth);
    res.json(relationships);
  } catch (error) {
    next(error);
  }
});

// Predictive Insights Routes
router.get('/predictive-insights', authenticateRequest, async (_req, res, next) => {
  try {
    const insights = await advancedAnalyticsService.getPredictiveInsights();
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

// Cross-Reference Validation Routes
router.get('/cross-reference', authenticateRequest, async (req, res, next) => {
  try {
    const searchTerm = req.query.search as string;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const validation = await advancedAnalyticsService.getCrossReferenceValidation(searchTerm);
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

// Investigative Task Summary Routes
router.get('/investigation-summary', authenticateRequest, async (_req, res, next) => {
  try {
    const summary = await advancedAnalyticsService.getInvestigativeTaskSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Visualization Routes

// Relationship Graph
router.get('/visualization/relationship-graph', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
    const maxNodes = req.query.maxNodes ? parseInt(req.query.maxNodes as string) : 100;
    const graph = await visualizationService.getRelationshipGraph(entityId, maxNodes);
    res.json(graph);
  } catch (error) {
    next(error);
  }
});

// Geospatial Data
router.get('/visualization/geospatial', authenticateRequest, async (_req, res, next) => {
  try {
    const data = await visualizationService.getGeospatialData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Timeline Visualization
router.get('/visualization/timeline', authenticateRequest, async (req, res, next) => {
  try {
    const searchTerm = req.query.search as string;
    const timeline = await visualizationService.getTimelineVisualization(searchTerm);
    res.json(timeline);
  } catch (error) {
    next(error);
  }
});

// Network Analysis
router.get('/visualization/network-analysis', authenticateRequest, async (_req, res, next) => {
  try {
    const analysis = await visualizationService.getNetworkAnalysis();
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// Interactive Map Data
router.get('/visualization/interactive-map', authenticateRequest, async (_req, res, next) => {
  try {
    const mapData = await visualizationService.getInteractiveMapData();
    res.json(mapData);
  } catch (error) {
    next(error);
  }
});

// Connection Inference
router.get('/visualization/connection-inference', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = parseInt(req.query.entityId as string);
    if (isNaN(entityId)) {
      return res.status(400).json({ error: 'Valid entity ID is required' });
    }
    const inferences = await visualizationService.getConnectionInference(entityId);
    res.json(inferences);
  } catch (error) {
    next(error);
  }
});

// Predictive Analytics Routes

// Pattern Predictions
router.get('/predictive/patterns', authenticateRequest, async (_req, res, next) => {
  try {
    const predictions = await predictiveAnalyticsService.getPatternPredictions();
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

// Risk Assessment Predictions
router.get('/predictive/risk-assessment', authenticateRequest, async (_req, res, next) => {
  try {
    const predictions = await predictiveAnalyticsService.getRiskAssessmentPredictions();
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

// Connection Inferences
router.get('/predictive/connection-inferences', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
    const inferences = await predictiveAnalyticsService.getConnectionInferences(entityId);
    res.json(inferences);
  } catch (error) {
    next(error);
  }
});

// Risk Assessment Dashboard
router.get('/predictive/risk-dashboard', authenticateRequest, async (_req, res, next) => {
  try {
    const dashboard = await predictiveAnalyticsService.getRiskAssessmentPredictions();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

// Predictive Insights
router.get('/predictive/insights', authenticateRequest, async (req, res, next) => {
  try {
    const searchTerm = req.query.search as string;
    const insights = await predictiveAnalyticsService.getPredictiveInsights(searchTerm);
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

// Pattern Predictions for Entity
router.get('/predictive/patterns/:entityId', authenticateRequest, async (req, res, next) => {
  try {
    const entityId = parseInt((req.params as { entityId: string }).entityId);
    if (isNaN(entityId)) {
      return res.status(400).json({ error: 'Valid entity ID is required' });
    }
    const predictions = await predictiveAnalyticsService.getPatternPredictionsForEntity(entityId);
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

export default router;
