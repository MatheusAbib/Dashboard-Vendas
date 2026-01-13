-- phpMyAdmin SQL Dump
-- version 3.4.9
-- http://www.phpmyadmin.net
--
-- Servidor: localhost
-- Tempo de Geração: 22/08/2025 às 17h33min
-- Versão do Servidor: 5.5.20
-- Versão do PHP: 5.3.9

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Banco de Dados: `dashboard`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `venda`
--

CREATE TABLE IF NOT EXISTS `venda` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `produto` varchar(255) DEFAULT NULL,
  `categoria` varchar(255) DEFAULT NULL,
  `quantidade` int(11) NOT NULL,
  `valor` double NOT NULL,
  `cidade` varchar(255) DEFAULT NULL,
  `cep` varchar(255) DEFAULT NULL,
  `estado` varchar(255) DEFAULT NULL,
  `pais` varchar(255) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `data_venda` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=28 ;

--
-- Extraindo dados da tabela `venda`
--

INSERT INTO `venda` (`id`, `produto`, `categoria`, `quantidade`, `valor`, `cidade`, `cep`, `estado`, `pais`, `latitude`, `longitude`, `data_venda`) VALUES
(2, 'iPhone 15', 'Celulares', 2, 7000, 'Rio de Janeiro', '20031-170', 'RJ', 'Brasil', -22.9068, -43.1729, '2020-02-13 23:57:13'),
(3, 'Smart TV Samsung 55"', 'Eletrônicos', 1, 2800, 'Belo Horizonte', '30130-010', 'MG', 'Brasil', -19.9167, -43.9345, '2019-07-27 07:05:52'),
(4, 'Geladeira Brastemp Frost Free', 'Eletrodomésticos', 1, 3500, 'Porto Alegre', '90010-000', 'RS', 'Brasil', -30.0331, -51.23, '2018-10-20 04:13:56'),
(5, 'Cadeira Gamer ThunderX3', 'Móveis', 4, 1200, 'Curitiba', '80010-000', 'PR', 'Brasil', -25.4284, -49.2733, '2018-06-03 03:53:22'),
(6, 'Mesa de Escritório', 'Móveis', 2, 800, 'Salvador', '40020-000', 'BA', 'Brasil', -12.9714, -38.5014, '2019-01-17 20:51:09'),
(7, 'Micro-ondas Electrolux', 'Eletrodomésticos', 3, 750, 'Fortaleza', '60025-000', 'CE', 'Brasil', -3.7172, -38.5433, '2019-08-15 19:51:12'),
(8, 'Teclado Mecânico Redragon', 'Eletrônicos', 5, 900, 'Manaus', '69010-000', 'AM', 'Brasil', -3.119, -60.0217, '2021-12-02 15:30:56'),
(9, 'Mouse Gamer Logitech', 'Eletrônicos', 6, 720, 'Recife', '50010-000', 'PE', 'Brasil', -8.0476, -34.877, '2019-12-07 11:01:04'),
(10, 'Samsung Galaxy S24', 'Celulares', 3, 990, 'Pinheiros', '11111-111', 'SP', 'Brasil', -23.567249, -46.7019515, '2020-04-16 23:33:16'),
(11, 'Ar Condicionado LG Dual Inverter', 'Eletrodomésticos', 2, 5000, 'Campinas', '13010-900', 'SP', 'Brasil', -22.9099, -47.0626, '2023-11-28 10:44:43'),
(12, 'Tablet iPad Air', 'Eletrônicos', 1, 4500, 'Vitória', '29010-000', 'ES', 'Brasil', -20.3155, -40.3128, '2020-12-12 07:49:28'),
(13, 'Smartwatch Apple Watch', 'Celulares', 4, 6000, 'Florianópolis', '88010-400', 'SC', 'Brasil', -27.5954, -48.548, '2024-02-23 20:12:52'),
(14, 'Cadeira de Escritório Ergonômica', 'Móveis', 3, 1500, 'Goiânia', '74010-000', 'GO', 'Brasil', -16.6786, -49.253, '2023-03-21 01:38:20'),
(15, 'Console PlayStation 5', 'Eletrônicos', 2, 9000, 'Belém', '66010-000', 'PA', 'Brasil', -1.455, -48.502, '2023-10-17 20:43:29'),
(26, 'Leptop', 'Eletrônicos', 6, 900, 'Pinheiros', '11111-111', 'SP', 'Brasil', -23.567249, -46.7019515, '2025-08-22 14:58:07');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
