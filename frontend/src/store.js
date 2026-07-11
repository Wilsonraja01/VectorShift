// store.js

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    MarkerType,
  } from 'reactflow';

export const useStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      token: null,
      currentPipelineId: null,
      currentPipelineName: null,
      isDirty: false,
      login: (user, token) => set({ currentUser: user, token }),
      logout: () => set({ currentUser: null, token: null, currentPipelineId: null, currentPipelineName: null, nodes: [], edges: [], isDirty: false }),
      updateUser: (updates) => set({ currentUser: { ...get().currentUser, ...updates } }),
      nodes: [],
      edges: [],
      nodeIDs: {},
      tourRun: false,
      setTourRun: (run) => set({ tourRun: run }),
      getNodeID: (type) => {
          const newIDs = {...get().nodeIDs};
          if (newIDs[type] === undefined) {
              newIDs[type] = 0;
          }
          newIDs[type] += 1;
          set({nodeIDs: newIDs});
          return `${type}-${newIDs[type]}`;
      },
      addNode: (node) => {
          set({
              nodes: [...get().nodes, node],
              isDirty: true
          });
      },
      loadPipeline: (nodes, edges, pipelineId = null, pipelineName = null) => {
          // Compute the max node IDs to prevent new nodes from resetting IDs to 0
          const nodeIDs = {};
          nodes.forEach(n => {
              const parts = n.id.split('-');
              const type = parts[0];
              const num = parseInt(parts[1] || '0', 10);
              if (!nodeIDs[type] || num > nodeIDs[type]) {
                  nodeIDs[type] = num;
              }
          });
          set({ nodes, edges, nodeIDs, currentPipelineId: pipelineId, currentPipelineName: pipelineName, isDirty: false });
      },
      clearPipeline: () => set({ nodes: [], edges: [], currentPipelineId: null, currentPipelineName: null, isDirty: false }),
      removeNode: (nodeId) => {
          set({
              nodes: get().nodes.filter((node) => node.id !== nodeId),
              edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
              isDirty: true
          });
      },
      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
          isDirty: changes.some(c => c.type !== 'select' && c.type !== 'dimensions') ? true : get().isDirty,
        });
      },
      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
          isDirty: changes.some(c => c.type !== 'select') ? true : get().isDirty,
        });
      },
      onConnect: (connection) => {
        set({
          edges: addEdge({...connection, type: 'smoothstep', animated: true, markerEnd: {type: MarkerType.ArrowClosed, height: 20, width: 20}}, get().edges),
          isDirty: true
        });
      },
      updateNodeField: (nodeId, fieldName, fieldValue) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, data: { ...node.data, [fieldName]: fieldValue } };
            }
            return node;
          }),
          isDirty: true
        });
      },
      updateNodeStyle: (nodeId, newStyle) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id === nodeId) {
              const updatedNode = { ...node, style: { ...node.style, ...newStyle } };
              if (newStyle.width !== undefined) updatedNode.width = parseInt(newStyle.width);
              if (newStyle.height !== undefined) updatedNode.height = parseInt(newStyle.height);
              return updatedNode;
            }
            return node;
          }),
          // don't mark as dirty just for auto-resizing
        });
      },
      savePipelineToServer: async (nameToSave, isNew = false) => {
          const state = get();
          const token = state.token;
          if (!token) throw new Error("You must be logged in to save pipelines.");
          const method = (isNew || !state.currentPipelineId) ? 'POST' : 'PUT';
          const url = (isNew || !state.currentPipelineId) ? `https://vector-shift-backend.fly.dev/pipelines` : `https://vector-shift-backend.fly.dev/pipelines/${state.currentPipelineId}`;
          const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ name: nameToSave, nodes: JSON.stringify(state.nodes), edges: JSON.stringify(state.edges) })
          });
          const data = await response.json();
          if (response.ok && data.status === 'success') {
              set({ 
                  currentPipelineId: method === 'POST' ? data.id : state.currentPipelineId, 
                  currentPipelineName: nameToSave, 
                  isDirty: false 
              });
              return data;
          } else {
              throw new Error(data.detail || "Failed to save pipeline");
          }
      },
      customNodes: [],
      fetchCustomNodes: async () => {
          const state = get();
          const isGlobalDemo = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
          const isDemo = state.currentUser?.id === 'demo' || isGlobalDemo;
          
          if (isDemo) {
              const localNodes = localStorage.getItem('demo_custom_nodes');
              set({ customNodes: localNodes ? JSON.parse(localNodes) : [] });
              return;
          }
          
          if (!state.token) return;
          try {
              const response = await fetch(`https://vector-shift-backend.fly.dev/custom-nodes`, {
                  headers: { 'Authorization': `Bearer ${state.token}` }
              });
              const data = await response.json();
              if (response.ok && data.status === 'success') {
                  set({ customNodes: data.custom_nodes });
              }
          } catch(e) { console.error("Failed to fetch custom nodes", e); }
      },
      addCustomNode: async (name, config) => {
          const state = get();
          const isGlobalDemo = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
          const isDemo = state.currentUser?.id === 'demo' || isGlobalDemo;
          const configStr = typeof config === 'string' ? config : JSON.stringify(config);
          
          if (isDemo) {
              const newNode = { id: `demo-node-${Date.now()}`, name, config: configStr, created_at: new Date().toISOString() };
              const updatedNodes = [newNode, ...state.customNodes];
              localStorage.setItem('demo_custom_nodes', JSON.stringify(updatedNodes));
              set({ customNodes: updatedNodes });
              return;
          }
          
          if (!state.token) throw new Error("You must be logged in to create custom nodes.");
          
          const response = await fetch(`https://vector-shift-backend.fly.dev/custom-nodes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
              body: JSON.stringify({ name, config: configStr })
          });
          const data = await response.json();
          if (response.ok && data.status === 'success') {
              get().fetchCustomNodes();
          } else {
              throw new Error(data.detail || "Failed to save custom node");
          }
      },
      updateCustomNode: async (nodeId, name, config) => {
          const state = get();
          const isGlobalDemo = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
          const isDemo = state.currentUser?.id === 'demo' || isGlobalDemo;
          const configStr = typeof config === 'string' ? config : JSON.stringify(config);
          const oldNodeDef = state.customNodes.find(n => n.id === nodeId);
          const oldName = oldNodeDef?.name;
          
          if (isDemo) {
               const updatedNodes = state.customNodes.map(n => 
                   n.id === nodeId ? { ...n, name, config: configStr } : n
               );
               const currentCanvasNodes = get().nodes;
               const updatedCanvasNodes = currentCanvasNodes.map(n => {
                   if (n.type === 'customNode') {
                       const nodeConfigName = typeof n.data?.config === 'string' 
                           ? (() => { try { return JSON.parse(n.data.config).name; } catch(e) { return null; } })() 
                           : n.data?.config?.name;
                       
                       if (n.data?.customNodeId === nodeId || nodeConfigName === oldName) {
                           return { ...n, data: { ...n.data, config: configStr, customNodeId: nodeId } };
                       }
                   }
                   return n;
               });
                const currentEdges = state.edges;
                set({ customNodes: updatedNodes, nodes: [], edges: [] });
                setTimeout(() => set({ nodes: updatedCanvasNodes, edges: currentEdges }), 10);
                return;
           }
          
          if (!state.token) throw new Error("You must be logged in to update custom nodes.");
          
          const response = await fetch(`https://vector-shift-backend.fly.dev/custom-nodes/${nodeId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
              body: JSON.stringify({ name, config: configStr })
          });
          const data = await response.json();
           if (response.ok && data.status === 'success') {
               const currentCanvasNodes = get().nodes;
               const updatedCanvasNodes = currentCanvasNodes.map(n => {
                   if (n.type === 'customNode') {
                       const nodeConfigName = typeof n.data?.config === 'string' 
                           ? (() => { try { return JSON.parse(n.data.config).name; } catch(e) { return null; } })() 
                           : n.data?.config?.name;
                       
                       if (n.data?.customNodeId === nodeId || nodeConfigName === oldName) {
                           return { ...n, data: { ...n.data, config: configStr, customNodeId: nodeId } };
                       }
                   }
                   return n;
               });
                const currentEdges = get().edges;
                set({ nodes: [], edges: [] });
                setTimeout(() => set({ nodes: updatedCanvasNodes, edges: currentEdges }), 10);
                get().fetchCustomNodes();
          } else {
              throw new Error(data.detail || "Failed to update custom node");
          }
      },
      deleteCustomNode: async (nodeId) => {
          const state = get();
          const isGlobalDemo = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
          const isDemo = state.currentUser?.id === 'demo' || isGlobalDemo;
          
          if (isDemo) {
              const updatedNodes = state.customNodes.filter(n => n.id !== nodeId);
              localStorage.setItem('demo_custom_nodes', JSON.stringify(updatedNodes));
              set({ customNodes: updatedNodes });
              return;
          }
          
          if (!state.token) throw new Error("You must be logged in to delete custom nodes.");
          
          const response = await fetch(`https://vector-shift-backend.fly.dev/custom-nodes/${nodeId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${state.token}` }
          });
          if (response.ok) {
              set({ customNodes: state.customNodes.filter(n => n.id !== nodeId) });
          } else {
              throw new Error("Failed to delete custom node");
          }
      },
    }),
    {
      name: 'vector-shift-auth-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ 
          currentUser: state.currentUser, 
          token: state.token,
          nodes: state.nodes,
          edges: state.edges,
          nodeIDs: state.nodeIDs,
          currentPipelineId: state.currentPipelineId,
          currentPipelineName: state.currentPipelineName,
          isDirty: state.isDirty
      }),
    }
  )
);
