import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Position, useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './baseNode';
import { NodeTextarea } from './NodeTextarea';
import { NodeInput, NodeDropdown, NodeTextareaField } from './NodeField';

// ==========================================
// 1. INPUT NODE
// ==========================================
export const InputNode = ({ id, data }) => {
  const handles = [
    { type: 'source', position: Position.Right, id: `${id}-value` }
  ];

  return (
    <BaseNode id={id} title="Input" handles={handles} minHeight={220}>
      <NodeInput id={id} fieldName="inputName" label="Name:" defaultValue={id.replace('customInput-', 'input_')} />
      <NodeDropdown 
        id={id} 
        fieldName="inputType" 
        label="Type:" 
        defaultValue="Text" 
        options={[
          { value: 'Text', label: 'Text' },
          { value: 'File', label: 'File' }
        ]} 
      />
    </BaseNode>
  );
};

// ==========================================
// 2. OUTPUT NODE
// ==========================================
export const OutputNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-value` }
  ];

  return (
    <BaseNode id={id} title="Output" handles={handles} minHeight={220}>
      <NodeInput id={id} fieldName="outputName" label="Name:" defaultValue={id.replace('customOutput-', 'output_')} />
      <NodeDropdown 
        id={id} 
        fieldName="outputType" 
        label="Type:" 
        defaultValue="Text" 
        options={[
          { value: 'Text', label: 'Text' },
          { value: 'File', label: 'Image' }
        ]} 
      />
    </BaseNode>
  );
};

// ==========================================
// 3. TEXT NODE (Contains Dynamic Variables & Spawning logic)
// ==========================================
export const TextNode = ({ id, data }) => {
  const [currText, setCurrText] = useState(data?.text || '{{input}}');
  const updateNodeInternals = useUpdateNodeInternals();

  const updateNodeField = useStore((state) => state.updateNodeField);

  // Extract variables synchronously during render to prevent unnecessary double re-renders
  const variables = useMemo(() => {
    const regex = /{{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*}}/g;
    let match;
    const foundVars = new Set();
    while ((match = regex.exec(currText)) !== null) {
      foundVars.add(match[1]);
    }
    return Array.from(foundVars);
  }, [currText]);

  const prevVariablesRef = useRef(null);

  useEffect(() => {
    // Initialize prevVariables on first mount to prevent spurious spawning on pipeline load
    if (prevVariablesRef.current === null) {
      prevVariablesRef.current = variables;
      return;
    }

    // Only run if variables actually changed
    if (variables.length === prevVariablesRef.current.length && 
        variables.every(v => prevVariablesRef.current.includes(v))) {
        return;
    }

    const newVars = variables.filter(v => !prevVariablesRef.current.includes(v));
    const removedVars = prevVariablesRef.current.filter(v => !variables.includes(v));
    
    if (newVars.length > 0 || removedVars.length > 0) {
      const state = useStore.getState();
      const thisNode = state.nodes.find(n => n.id === id);
      
      if (removedVars.length > 0) {
        const edgesToRemove = state.edges.filter(edge => 
          edge.target === id && removedVars.some(rv => edge.targetHandle === `${id}-${rv}`)
        );
        if (edgesToRemove.length > 0) {
          state.onEdgesChange(edgesToRemove.map(edge => ({ id: edge.id, type: 'remove' })));
        }
      }
      
      if (thisNode && newVars.length > 0) {
        newVars.forEach((newVar) => {
          const varIndex = variables.indexOf(newVar);
          const inputNodeId = state.getNodeID('customInput');
          
          const newNode = {
            id: inputNodeId,
            type: 'customInput',
            position: {
              x: thisNode.position.x - 350,
              y: thisNode.position.y + (varIndex * 250)
            },
            data: { id: inputNodeId, nodeType: 'customInput', inputName: newVar, inputType: 'Text' }
          };
          
          state.addNode(newNode);
          
          state.onConnect({
            source: inputNodeId,
            sourceHandle: `${inputNodeId}-value`,
            target: id,
            targetHandle: `${id}-${newVar}`
          });
        });
      }
      
      // Internal refresh to force React Flow to recalculate edge positions for newly spawned DOM nodes and remaining handles
      setTimeout(() => {
          const textarea = document.getElementById(`textarea-${id}`);
          const hadFocus = document.activeElement === textarea;
          const selectionStart = textarea ? textarea.selectionStart : 0;
          const selectionEnd = textarea ? textarea.selectionEnd : 0;

          const currentNodes = useStore.getState().nodes;
          const currentEdges = useStore.getState().edges;
          useStore.setState({ nodes: [], edges: [] });
          
          setTimeout(() => {
              useStore.setState({ nodes: currentNodes, edges: currentEdges });
              if (hadFocus) {
                  setTimeout(() => {
                      const newTextarea = document.getElementById(`textarea-${id}`);
                      if (newTextarea) {
                          newTextarea.focus();
                          newTextarea.setSelectionRange(selectionStart, selectionEnd);
                      }
                  }, 10);
              }
          }, 10);
      }, 50);
    }
    
    prevVariablesRef.current = variables;
  }, [variables, id]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [variables, id, updateNodeInternals]);

  const handleTextChange = useCallback((e) => {
    setCurrText(e.target.value);
    updateNodeField(id, 'text', e.target.value);
  }, [id, updateNodeField]);

  // Memoize handles to prevent unnecessary object creation on every keystroke
  const handles = useMemo(() => {
    const dynamicHandles = variables.map((variable, index) => ({
      type: 'target',
      position: Position.Left,
      id: `${id}-${variable}`,
      style: { top: `${((index + 1) * 100) / (variables.length + 1)}%` }
    }));
    
    return [
      ...dynamicHandles,
      { type: 'source', position: Position.Right, id: `${id}-output` }
    ];
  }, [variables, id]);

  return (
    <BaseNode id={id} title="Text" handles={handles} resizeAxes="horizontal">
      <NodeTextarea
        nodeId={id}
        value={currText}
        onChange={handleTextChange}
        placeholder="Type here... Use {{variable}} to create inputs."
      />
    </BaseNode>
  );
};

// ==========================================
// 4. LLM NODE
// ==========================================
export const LLMNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-system`, style: { top: `${100/3}%` } },
    { type: 'target', position: Position.Left, id: `${id}-prompt`, style: { top: `${200/3}%` } },
    { type: 'source', position: Position.Right, id: `${id}-response` }
  ];

  return (
    <BaseNode id={id} title="LLM" handles={handles} resizeAxes="horizontal">
      <NodeTextareaField
        id={id}
        fieldName="prompt"
        defaultValue=""
        placeholder="System Prompt..."
        textColor="#10b981"
      />
    </BaseNode>
  );
};

// ==========================================
// 5. API NODE
// ==========================================
export const ApiNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-payload` },
    { type: 'source', position: Position.Right, id: `${id}-response` }
  ];

  return (
    <BaseNode id={id} title="API Request" handles={handles}>
      <NodeInput id={id} fieldName="endpoint" label="Endpoint:" defaultValue="https://api.example.com" />
      <NodeDropdown 
        id={id} 
        fieldName="method" 
        label="Method:" 
        defaultValue="GET" 
        options={[
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' }
        ]} 
      />
    </BaseNode>
  );
};

// ==========================================
// 6. CONDITION NODE
// ==========================================
export const ConditionNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-input` },
    { type: 'source', position: Position.Right, id: `${id}-true`, style: { top: '33%' } },
    { type: 'source', position: Position.Right, id: `${id}-false`, style: { top: '66%' } }
  ];

  return (
    <BaseNode id={id} title="Condition" handles={handles}>
      <NodeInput id={id} fieldName="condition" label="If:" defaultValue="data.value > 0" />
    </BaseNode>
  );
};

// ==========================================
// 7. DATABASE NODE
// ==========================================
export const DatabaseNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-params` },
    { type: 'source', position: Position.Right, id: `${id}-rows` }
  ];

  return (
    <BaseNode id={id} title="Database" handles={handles} resizeAxes="horizontal">
      <NodeTextareaField
        id={id}
        fieldName="query"
        defaultValue="SELECT * FROM users;"
        placeholder="SELECT * FROM users;"
        textColor="#a5b4fc"
        fontFamily="Consolas, Monaco, monospace"
        spellCheck={false}
      />
    </BaseNode>
  );
};

// ==========================================
// 8. SLACK NODE
// ==========================================
export const SlackNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-message` },
    { type: 'source', position: Position.Right, id: `${id}-status` }
  ];

  return (
    <BaseNode id={id} title="Slack Message" handles={handles}>
      <NodeInput id={id} fieldName="channel" label="Channel:" defaultValue="#general" />
    </BaseNode>
  );
};

// ==========================================
// 9. TRANSFORM NODE
// ==========================================
export const TransformNode = ({ id, data }) => {
  const handles = [
    { type: 'target', position: Position.Left, id: `${id}-input` },
    { type: 'source', position: Position.Right, id: `${id}-output` }
  ];

  return (
    <BaseNode id={id} title="Transform Logic" handles={handles} resizeAxes="horizontal">
      <NodeTextareaField
        id={id}
        fieldName="logic"
        defaultValue="return data;"
        placeholder="return data;"
        textColor="#fcd34d"
        fontFamily="Consolas, Monaco, monospace"
        spellCheck={false}
      />
    </BaseNode>
  );
};
