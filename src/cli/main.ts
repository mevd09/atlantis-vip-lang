import { Command } from 'commander';
import { NodeFileSystem } from 'langium/node';
import { createAtlantisVipServices } from '../language/atlantis-vip-module.js';
import { showAst } from './ast-viewer.js';

const program = new Command();

program
    .name('atlantis-vip-cli')
    .description('CLI for the Atlantis VIP language')
    .version('0.0.1');

program
    .command('ast')
    .description('Show the AST for a given file')
    .argument('<file>', 'source file (*.vip, *.vpp)')
    .action(async (file) => {
        const services = createAtlantisVipServices(NodeFileSystem).AtlantisVip;
        await showAst(file, services);
    });

program.parse(process.argv); 