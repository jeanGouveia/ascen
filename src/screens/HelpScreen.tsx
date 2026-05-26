import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';

const FAQ_SECTIONS = [
  {
    title: 'O que é o Ascen?',
    body:
      'O Ascen é um app de controle financeiro pessoal. Você registra receitas, despesas, lançamentos recorrentes e metas — tudo armazenado localmente no seu dispositivo.',
  },
  {
    title: 'Como adicionar um lançamento?',
    body:
      'Na aba Lançamentos, toque no botão + no canto inferior direito. Preencha o tipo (receita ou despesa), valor, categoria e data. Toque em Salvar.',
  },
  {
    title: 'O que são lançamentos recorrentes?',
    body:
      'São despesas ou receitas que se repetem todo mês — como aluguel, salário ou assinatura. Cadastre uma vez em Recorrentes e o app projeta automaticamente os próximos meses.',
  },
  {
    title: 'Como funcionam as metas?',
    body:
      'Na aba Metas você define um objetivo com nome, valor alvo e prazo. O app acompanha seu progresso conforme você registra aportes.',
  },
  {
    title: 'Como funciona a família?',
    body:
      'O dono da conta gera um código de 8 letras e compartilha com outro dispositivo. Os lançamentos marcados como compartilhados são sincronizados entre os dois.',
  },
  {
    title: 'Minhas informações ficam seguras?',
    body:
      'Sim. Os dados ficam salvos localmente no seu aparelho. E qualquer transferência de dados no caso de família o sistema usa criptografia de ponta a ponta.',
  },
] as const;

export function HelpScreen() {
  const { C, s } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Ajuda</Text>
        <Text style={[s.pageSubtitle, { marginBottom: 20 }]}>Como usar o Ascen</Text>

        {FAQ_SECTIONS.map((section, i) => (
          <Card key={section.title} style={{ marginBottom: i < FAQ_SECTIONS.length - 1 ? 14 : 0 }}>
            <Text style={[s.formLabel, { marginBottom: 8 }]}>{section.title}</Text>
            <Text style={[s.txMeta, { lineHeight: 20 }]}>{section.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
