import React from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { useSession } from '../context/SessionContext';

/**
 * Componente wrapper que captura toques globais e reseta o timer de inatividade.
 * Deve envolver toda a aplicação para garantir que qualquer interação do usuário
 * seja registrada como atividade.
 */
export function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { touch, setUserInteracting } = useSession();

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        touch();
        setUserInteracting(true);
        setTimeout(() => setUserInteracting(false), 1000);
      }}
      accessible={false}
    >
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
}
