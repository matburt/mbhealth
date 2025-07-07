{{/*
Expand the name of the chart.
*/}}
{{- define "mbhealth.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "mbhealth.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "mbhealth.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mbhealth.labels" -}}
helm.sh/chart: {{ include "mbhealth.chart" . }}
{{ include "mbhealth.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mbhealth.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mbhealth.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "mbhealth.backend.labels" -}}
{{ include "mbhealth.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "mbhealth.backend.selectorLabels" -}}
{{ include "mbhealth.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Worker labels
*/}}
{{- define "mbhealth.worker.labels" -}}
{{ include "mbhealth.labels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{/*
Worker selector labels
*/}}
{{- define "mbhealth.worker.selectorLabels" -}}
{{ include "mbhealth.selectorLabels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "mbhealth.frontend.labels" -}}
{{ include "mbhealth.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "mbhealth.frontend.selectorLabels" -}}
{{ include "mbhealth.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the name of the service account to use for backend
*/}}
{{- define "mbhealth.backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (printf "%s-backend" (include "mbhealth.fullname" .)) .Values.serviceAccount.backend }}
{{- else }}
{{- default "default" .Values.serviceAccount.backend }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use for worker
*/}}
{{- define "mbhealth.worker.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (printf "%s-worker" (include "mbhealth.fullname" .)) .Values.serviceAccount.worker }}
{{- else }}
{{- default "default" .Values.serviceAccount.worker }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use for frontend
*/}}
{{- define "mbhealth.frontend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (printf "%s-frontend" (include "mbhealth.fullname" .)) .Values.serviceAccount.frontend }}
{{- else }}
{{- default "default" .Values.serviceAccount.frontend }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use for migration
*/}}
{{- define "mbhealth.migration.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (printf "%s-migration" (include "mbhealth.fullname" .)) .Values.serviceAccount.migration }}
{{- else }}
{{- default "default" .Values.serviceAccount.migration }}
{{- end }}
{{- end }}

{{/*
Create database URL
*/}}
{{- define "mbhealth.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password .Release.Name .Values.postgresql.auth.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:%g/%s" .Values.externalDatabase.username .Values.externalDatabase.password .Values.externalDatabase.host .Values.externalDatabase.port .Values.externalDatabase.database }}
{{- end }}
{{- end }}

{{/*
Create Redis URL
*/}}
{{- define "mbhealth.redisUrl" -}}
{{- if .Values.redis.enabled }}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s-redis-master:6379/0" .Values.redis.auth.password .Release.Name }}
{{- else }}
{{- printf "redis://%s-redis-master:6379/0" .Release.Name }}
{{- end }}
{{- else }}
{{- if .Values.externalRedis.password }}
{{- printf "redis://:%s@%s:%g/%g" .Values.externalRedis.password .Values.externalRedis.host .Values.externalRedis.port .Values.externalRedis.database }}
{{- else }}
{{- printf "redis://%s:%g/%g" .Values.externalRedis.host .Values.externalRedis.port .Values.externalRedis.database }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create image name
*/}}
{{- define "mbhealth.image" -}}
{{- $registry := .registry }}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry .repository .tag }}
{{- else }}
{{- printf "%s:%s" .repository .tag }}
{{- end }}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "mbhealth.annotations" -}}
{{- with .Values.commonAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Create secret name for application secrets
*/}}
{{- define "mbhealth.secretName" -}}
{{- printf "%s-secret" (include "mbhealth.fullname" .) }}
{{- end }}

{{/*
Create secret name for API keys
*/}}
{{- define "mbhealth.apiKeysSecretName" -}}
{{- printf "%s-api-keys" (include "mbhealth.fullname" .) }}
{{- end }}

{{/*
Create configmap name
*/}}
{{- define "mbhealth.configMapName" -}}
{{- printf "%s-config" (include "mbhealth.fullname" .) }}
{{- end }}

{{/*
Create frontend configmap name
*/}}
{{- define "mbhealth.frontendConfigMapName" -}}
{{- printf "%s-frontend-config" (include "mbhealth.fullname" .) }}
{{- end }}