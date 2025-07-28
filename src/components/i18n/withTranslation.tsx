import React, { ComponentType, forwardRef } from 'react';
import { useTranslation, UseTranslationReturn } from '../../hooks/useI18n';
import { TranslationOptions } from '../../services/i18nService';

export interface WithTranslationProps {
  t: (key: string, options?: TranslationOptions) => string;
  tReady: boolean;
  i18n: UseTranslationReturn['i18n'];
}

export interface WithTranslationOptions {
  namespace?: string;
  keyPrefix?: string;
  withRef?: boolean;
}

export function withTranslation<TProps extends object>(
  Component: ComponentType<TProps & WithTranslationProps>,
  options: WithTranslationOptions = {}
) {
  const { namespace, keyPrefix, withRef } = options;

  const WithTranslationComponent = forwardRef<any, TProps>((props, ref) => {
    const { t: originalT, i18n } = useTranslation(namespace);

    const t = (key: string, translationOptions?: TranslationOptions) => {
      const finalKey = keyPrefix ? `${keyPrefix}.${key}` : key;
      return originalT(finalKey, translationOptions);
    };

    const enhancedProps = {
      ...props,
      t,
      tReady: true, // Always ready in this implementation
      i18n
    } as TProps & WithTranslationProps;

    if (withRef) {
      return <Component ref={ref} {...enhancedProps} />;
    }

    return <Component {...enhancedProps} />;
  });

  WithTranslationComponent.displayName = `withTranslation(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WithTranslationComponent;
}

export default withTranslation;