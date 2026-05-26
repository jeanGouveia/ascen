import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../hooks/useAppTheme';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  optional?: boolean;
}

export function DateField({ label, value, onChange, optional }: DateFieldProps) {
  const { C, R } = useAppTheme();
  const [show, setShow] = useState(false);

  const dateObj = value ? new Date(value + 'T12:00:00Z') : new Date();

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selected) {
      onChange(selected.toISOString().split('T')[0]);
    }
  };

  const display = value
    ? value.split('-').reverse().join('/')
    : optional ? 'Sem prazo' : 'Selecionar data';

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 6 }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: R.lg,
          padding: 12,
          backgroundColor: C.card,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
      >
        <Text style={{ color: value ? C.text : C.textMuted, fontSize: 15 }}>
          📅 {display}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          locale="pt-BR"
        />
      )}
    </View>
  );
}
