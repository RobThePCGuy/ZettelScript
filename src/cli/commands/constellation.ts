import { Command } from 'commander';
import { initContext, printTable } from '../utils.js';

export const constellationCommand = new Command('constellation')
  .alias('const')
  .description('Manage saved graph views (constellations)');

/**
 * Save a new constellation from JSON state
 */
constellationCommand
  .command('save <name>')
  .description('Save a constellation from JSON state')
  .option('-s, --state <json>', 'State JSON from visualizer')
  .option('-d, --description <text>', 'Description for the constellation')
  .action(async (name: string, options: { state?: string; description?: string }) => {
    try {
      const ctx = await initContext();

      // Check if constellation already exists
      const existing = await ctx.constellationRepository.findByName(name);
      if (existing) {
        console.error(
          `Constellation "${name}" already exists. Use a different name or delete it first.`
        );
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Parse state if provided
      let state: {
        hiddenNodeTypes?: string[];
        hiddenEdgeTypes?: string[];
        showGhosts?: boolean;
        ghostThreshold?: number;
        cameraX?: number;
        cameraY?: number;
        cameraZoom?: number;
        focusNodeIds?: string[];
      } = {};

      if (options.state) {
        try {
          state = JSON.parse(options.state);
        } catch (e) {
          console.error('Invalid JSON state:', e);
          ctx.connectionManager.close();
          process.exit(1);
        }
      }

      // Create the constellation
      const createInput: Parameters<typeof ctx.constellationRepository.create>[0] = {
        name,
        hiddenNodeTypes: state.hiddenNodeTypes ?? [],
        hiddenEdgeTypes: state.hiddenEdgeTypes ?? [],
        showGhosts: state.showGhosts ?? true,
        ghostThreshold: state.ghostThreshold ?? 1,
      };

      // Only set optional properties if they have values
      if (options.description !== undefined) createInput.description = options.description;
      if (state.cameraX !== undefined) createInput.cameraX = state.cameraX;
      if (state.cameraY !== undefined) createInput.cameraY = state.cameraY;
      if (state.cameraZoom !== undefined) createInput.cameraZoom = state.cameraZoom;
      if (state.focusNodeIds !== undefined) createInput.focusNodeIds = state.focusNodeIds;

      const constellation = await ctx.constellationRepository.create(createInput);

      console.log(`Constellation "${constellation.name}" saved successfully.`);
      console.log(`\nTo load it, run: zs visualize --constellation "${name}"`);

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to save constellation:', error);
      process.exit(1);
    }
  });

/**
 * List all constellations
 */
constellationCommand
  .command('list')
  .alias('ls')
  .description('List all saved constellations')
  .action(async () => {
    try {
      const ctx = await initContext();
      const constellations = await ctx.constellationRepository.findAll();

      if (constellations.length === 0) {
        console.log('No constellations saved yet.');
        console.log('\nTo save one, open the visualizer and click "Save Current View".');
        ctx.connectionManager.close();
        return;
      }

      const rows = constellations.map((c) => [
        c.name,
        c.description || '-',
        c.hiddenNodeTypes.length > 0 ? `${c.hiddenNodeTypes.length} hidden` : 'all',
        c.hiddenEdgeTypes.length > 0 ? `${c.hiddenEdgeTypes.length} hidden` : 'all',
        c.showGhosts ? 'yes' : 'no',
        new Date(c.updatedAt).toLocaleDateString(),
      ]);

      printTable(['Name', 'Description', 'Node Types', 'Edge Types', 'Ghosts', 'Updated'], rows);

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to list constellations:', error);
      process.exit(1);
    }
  });

/**
 * Show details of a specific constellation
 */
constellationCommand
  .command('show <name>')
  .description('Show details of a constellation')
  .action(async (name: string) => {
    try {
      const ctx = await initContext();
      const constellation = await ctx.constellationRepository.findByName(name);

      if (!constellation) {
        console.error(`Constellation "${name}" not found.`);
        ctx.connectionManager.close();
        process.exit(1);
      }

      console.log(`\nConstellation: ${constellation.name}`);
      console.log('─'.repeat(40));

      if (constellation.description) {
        console.log(`Description: ${constellation.description}`);
      }

      console.log(`\nFilters:`);
      console.log(
        `  Hidden node types: ${constellation.hiddenNodeTypes.length > 0 ? constellation.hiddenNodeTypes.join(', ') : '(none)'}`
      );
      console.log(
        `  Hidden edge types: ${constellation.hiddenEdgeTypes.length > 0 ? constellation.hiddenEdgeTypes.join(', ') : '(none)'}`
      );

      console.log(`\nGhost Nodes:`);
      console.log(`  Show ghosts: ${constellation.showGhosts ? 'yes' : 'no'}`);
      console.log(`  Min references: ${constellation.ghostThreshold}`);

      if (constellation.cameraX !== undefined || constellation.cameraY !== undefined) {
        console.log(`\nCamera:`);
        console.log(
          `  Position: (${constellation.cameraX?.toFixed(2) ?? 'auto'}, ${constellation.cameraY?.toFixed(2) ?? 'auto'})`
        );
        console.log(`  Zoom: ${constellation.cameraZoom?.toFixed(2) ?? 'auto'}`);
      }

      if (constellation.focusNodeIds && constellation.focusNodeIds.length > 0) {
        console.log(`\nFocus nodes: ${constellation.focusNodeIds.length}`);
      }

      console.log(`\nCreated: ${new Date(constellation.createdAt).toLocaleString()}`);
      console.log(`Updated: ${new Date(constellation.updatedAt).toLocaleString()}`);

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to show constellation:', error);
      process.exit(1);
    }
  });

/**
 * Delete a constellation
 */
constellationCommand
  .command('delete <name>')
  .alias('rm')
  .description('Delete a constellation')
  .action(async (name: string) => {
    try {
      const ctx = await initContext();
      const deleted = await ctx.constellationRepository.deleteByName(name);

      if (!deleted) {
        console.error(`Constellation "${name}" not found.`);
        ctx.connectionManager.close();
        process.exit(1);
      }

      console.log(`Constellation "${name}" deleted.`);
      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to delete constellation:', error);
      process.exit(1);
    }
  });

/**
 * Update an existing constellation
 */
constellationCommand
  .command('update <name>')
  .description('Update an existing constellation')
  .option('-s, --state <json>', 'New state JSON')
  .option('-d, --description <text>', 'New description')
  .option('-n, --new-name <name>', 'Rename the constellation')
  .action(
    async (name: string, options: { state?: string; description?: string; newName?: string }) => {
      try {
        const ctx = await initContext();
        const existing = await ctx.constellationRepository.findByName(name);

        if (!existing) {
          console.error(`Constellation "${name}" not found.`);
          ctx.connectionManager.close();
          process.exit(1);
        }

        // Parse state if provided
        let stateUpdates: {
          hiddenNodeTypes?: string[];
          hiddenEdgeTypes?: string[];
          showGhosts?: boolean;
          ghostThreshold?: number;
          cameraX?: number;
          cameraY?: number;
          cameraZoom?: number;
          focusNodeIds?: string[];
        } = {};

        if (options.state) {
          try {
            stateUpdates = JSON.parse(options.state);
          } catch (e) {
            console.error('Invalid JSON state:', e);
            ctx.connectionManager.close();
            process.exit(1);
          }
        }

        const updates = {
          ...stateUpdates,
          ...(options.description !== undefined && { description: options.description }),
          ...(options.newName !== undefined && { name: options.newName }),
        };

        await ctx.constellationRepository.update(existing.constellationId, updates);

        const finalName = options.newName ?? name;
        console.log(`Constellation "${finalName}" updated.`);

        ctx.connectionManager.close();
      } catch (error) {
        console.error('Failed to update constellation:', error);
        process.exit(1);
      }
    }
  );
