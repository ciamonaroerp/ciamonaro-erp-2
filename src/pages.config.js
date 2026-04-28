/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ComercialOrcamentosPage from './pages/ComercialOrcamentosPage';
import ConfiguracaoExtrasPage from './pages/ConfiguracaoExtrasPage';
import ConfiguracaoTecidoPage from './pages/ConfiguracaoTecidoPage';
import EmpresasConfigPage from './pages/EmpresasConfigPage';
import FinanceiroConfiguracoesPage from './pages/FinanceiroConfiguracoesPage';
import ServicosPage from './pages/ServicosPage';
import AtivarConta from './pages/AtivarConta';
import AuditoriaArquitetura from './pages/AuditoriaArquitetura';
import ClientesPage from './pages/ClientesPage';
import ComercialPage from './pages/ComercialPage';
import ComprasPage from './pages/ComprasPage';
import ConfiguracaoAuditoria from './pages/ConfiguracaoAuditoria';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import Dashboard from './pages/Dashboard';
import DeployManager from './pages/DeployManager';
import EmbalagemPage from './pages/EmbalagemPage';
import EstoqueMpPage from './pages/EstoqueMpPage';
import EstoquePaPage from './pages/EstoquePaPage';
import FinanceiroPage from './pages/FinanceiroPage';
import FiscalPage from './pages/FiscalPage';
import FornecedoresPage from './pages/FornecedoresPage';
import IntegracoesERP from './pages/IntegracoesERP';
import LogisticaPage from './pages/LogisticaPage';
import LogsAuditoria from './pages/LogsAuditoria';
import MateriaPrimaPage from './pages/MateriaPrimaPage';
import ModalidadeFrete from './pages/ModalidadeFrete';
import ModulosPage from './pages/ModulosPage';
import PerfisAcesso from './pages/PerfisAcesso';
import PpcpPage from './pages/PpcpPage';
import ProducaoPage from './pages/ProducaoPage';
import ProdutoComercialPage from './pages/ProdutoComercialPage';
import QualidadePage from './pages/QualidadePage';
import SistemaLogsPage from './pages/SistemaLogsPage';
import SupabaseDebug2 from './pages/SupabaseDebug2';
import Transportadoras from './pages/Transportadoras';
import Usuarios from './pages/Usuarios';
import VinculosCadastroPage from './pages/VinculosCadastroPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ComercialOrcamentosPage": ComercialOrcamentosPage,
    "ConfiguracaoExtrasPage": ConfiguracaoExtrasPage,
    "ConfiguracaoTecidoPage": ConfiguracaoTecidoPage,
    "EmpresasConfigPage": EmpresasConfigPage,
    "FinanceiroConfiguracoesPage": FinanceiroConfiguracoesPage,
    "ServicosPage": ServicosPage,
    "AtivarConta": AtivarConta,
    "AuditoriaArquitetura": AuditoriaArquitetura,
    "ClientesPage": ClientesPage,
    "ComercialPage": ComercialPage,
    "ComprasPage": ComprasPage,
    "ConfiguracaoAuditoria": ConfiguracaoAuditoria,
    "ConfiguracoesPage": ConfiguracoesPage,
    "Dashboard": Dashboard,
    "DeployManager": DeployManager,
    "EmbalagemPage": EmbalagemPage,
    "EstoqueMpPage": EstoqueMpPage,
    "EstoquePaPage": EstoquePaPage,
    "FinanceiroPage": FinanceiroPage,
    "FiscalPage": FiscalPage,
    "FornecedoresPage": FornecedoresPage,
    "IntegracoesERP": IntegracoesERP,
    "LogisticaPage": LogisticaPage,
    "LogsAuditoria": LogsAuditoria,
    "MateriaPrimaPage": MateriaPrimaPage,
    "ModalidadeFrete": ModalidadeFrete,
    "ModulosPage": ModulosPage,
    "PerfisAcesso": PerfisAcesso,
    "PpcpPage": PpcpPage,
    "ProducaoPage": ProducaoPage,
    "ProdutoComercialPage": ProdutoComercialPage,
    "QualidadePage": QualidadePage,
    "SistemaLogsPage": SistemaLogsPage,
    "SupabaseDebug2": SupabaseDebug2,
    "Transportadoras": Transportadoras,
    "Usuarios": Usuarios,
    "VinculosCadastroPage": VinculosCadastroPage,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};