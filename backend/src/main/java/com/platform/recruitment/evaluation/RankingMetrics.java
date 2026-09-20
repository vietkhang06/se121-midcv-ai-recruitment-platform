package com.platform.recruitment.evaluation;

import java.util.*;

/**
 * Deterministic evaluation utility for ranking quality.
 * Computes Discounted Cumulative Gain (DCG), Ideal DCG (IDCG),
 * Normalized Discounted Cumulative Gain at K (NDCG@K), and Precision@K.
 */
public class RankingMetrics {

    public static class RankingItem {
        private final String id;
        private final double predictedScore;
        private final double groundTruthRelevance;

        public RankingItem(String id, double predictedScore, double groundTruthRelevance) {
            this.id = id;
            this.predictedScore = predictedScore;
            this.groundTruthRelevance = groundTruthRelevance;
        }

        public String getId() { return id; }
        public double getPredictedScore() { return predictedScore; }
        public double getGroundTruthRelevance() { return groundTruthRelevance; }
    }

    public static class NdcgResult {
        private final int k;
        private final double dcg;
        private final double idcg;
        private final double ndcg;
        private final double precisionAtK;

        public NdcgResult(int k, double dcg, double idcg, double ndcg, double precisionAtK) {
            this.k = k;
            this.dcg = dcg;
            this.idcg = idcg;
            this.ndcg = ndcg;
            this.precisionAtK = precisionAtK;
        }

        public int getK() { return k; }
        public double getDcg() { return dcg; }
        public double getIdcg() { return idcg; }
        public double getNdcg() { return ndcg; }
        public double getPrecisionAtK() { return precisionAtK; }

        @Override
        public String toString() {
            return String.format("NdcgResult[k=%d, DCG=%.4f, IDCG=%.4f, NDCG=%.4f, P@%d=%.4f]",
                    k, dcg, idcg, ndcg, k, precisionAtK);
        }
    }

    public static double computeDcg(List<Double> relevanceScores, int k) {
        if (relevanceScores == null || relevanceScores.isEmpty() || k <= 0) {
            return 0.0;
        }
        double dcg = 0.0;
        int limit = Math.min(k, relevanceScores.size());
        for (int i = 0; i < limit; i++) {
            double rel = relevanceScores.get(i);
            double gain = Math.pow(2.0, rel) - 1.0;
            double discount = Math.log(i + 2) / Math.log(2.0); // log2(i + 2)
            dcg += gain / discount;
        }
        return dcg;
    }

    public static NdcgResult computeNdcgAtK(List<RankingItem> items, int k, double relevanceThreshold) {
        if (items == null || items.isEmpty() || k <= 0) {
            return new NdcgResult(k, 0.0, 0.0, 1.0, 0.0);
        }

        // Sort predicted items descending by predicted score
        List<RankingItem> sortedPred = new ArrayList<>(items);
        sortedPred.sort((a, b) -> Double.compare(b.getPredictedScore(), a.getPredictedScore()));

        List<Double> predRel = new ArrayList<>();
        for (RankingItem item : sortedPred) {
            predRel.add(item.getGroundTruthRelevance());
        }

        // Sort items descending by ground truth relevance for ideal ranking
        List<RankingItem> sortedIdeal = new ArrayList<>(items);
        sortedIdeal.sort((a, b) -> Double.compare(b.getGroundTruthRelevance(), a.getGroundTruthRelevance()));

        List<Double> idealRel = new ArrayList<>();
        for (RankingItem item : sortedIdeal) {
            idealRel.add(item.getGroundTruthRelevance());
        }

        double dcg = computeDcg(predRel, k);
        double idcg = computeDcg(idealRel, k);
        double ndcg = idcg > 0.0 ? dcg / idcg : 1.0;

        // Precision@K: fraction of top-K recommendations meeting or exceeding relevance threshold
        int limit = Math.min(k, sortedPred.size());
        long relevantCount = 0;
        for (int i = 0; i < limit; i++) {
            if (sortedPred.get(i).getGroundTruthRelevance() >= relevanceThreshold) {
                relevantCount++;
            }
        }
        double pAtK = (double) relevantCount / k;

        return new NdcgResult(k, dcg, idcg, ndcg, pAtK);
    }

    public static double computePrecisionAtK(List<RankingItem> items, int k, double relevanceThreshold) {
        return computeNdcgAtK(items, k, relevanceThreshold).getPrecisionAtK();
    }
}
