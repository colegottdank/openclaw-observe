
export function getOpenClawId(agent: any): string {
  // Map Name -> ID
  const name = agent.name.toLowerCase()
  
  if (name.includes('atlas')) return 'debateai-atlas'
  if (name.includes('forge')) return 'debateai-forge'
  if (name.includes('pixel')) return 'debateai-pixel'
  if (name.includes('echo')) return 'debateai-echo'
  if (name.includes('spud') || name === 'main') return 'main'
  if (name.includes('doctor')) return 'doctor'
  if (name.includes('sketch')) return 'sketch'

  // Map Convex ID Prefix -> ID
  if (agent._id.startsWith('j97c74')) return 'debateai-atlas'
  if (agent._id.startsWith('j970bc')) return 'debateai-forge'
  if (agent._id.startsWith('j9732a')) return 'debateai-pixel'
  if (agent._id.startsWith('j97atn')) return 'debateai-echo'
  if (agent._id.startsWith('j97bny')) return 'main'

  // Fallback: try using the ID directly if it looks like a slug
  if (agent._id.includes('-')) return agent._id

  return agent.name.toLowerCase()
}
