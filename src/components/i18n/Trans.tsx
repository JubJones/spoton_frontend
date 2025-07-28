import React, { ReactNode, Fragment } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { TranslationOptions } from '../../services/i18nService';

export interface TransProps {
  i18nKey: string;
  namespace?: string;
  count?: number;
  context?: string;
  values?: Record<string, any>;
  components?: Record<string, ReactNode>;
  children?: ReactNode;
  defaults?: string;
  parent?: string | React.ComponentType<any>;
  className?: string;
  style?: React.CSSProperties;
  shouldUnescape?: boolean;
  tOptions?: TranslationOptions;
}

interface InterpolationResult {
  key: string;
  type: 'text' | 'component' | 'interpolation';
  content: string | ReactNode;
  index: number;
}

export const Trans: React.FC<TransProps> = ({
  i18nKey,
  namespace,
  count,
  context,
  values = {},
  components = {},
  children,
  defaults,
  parent,
  className,
  style,
  shouldUnescape = false,
  tOptions = {}
}) => {
  const { t } = useI18n();

  const getTranslation = (): string => {
    const options: TranslationOptions = {
      ...tOptions,
      namespace,
      count,
      context,
      interpolation: values,
      defaultValue: defaults
    };

    return t(i18nKey, options);
  };

  const parseTranslation = (translation: string): InterpolationResult[] => {
    const results: InterpolationResult[] = [];
    let index = 0;

    // Handle component interpolation: <0>text</0>, <1>text</1>, etc.
    const componentRegex = /<(\w+)>(.*?)<\/\1>/g;
    // Handle self-closing components: <0/>, <1/>, etc.
    const selfClosingRegex = /<(\w+)\/>/g;
    // Handle interpolation: {{variable}}, {variable}
    const interpolationRegex = /\{\{?(\w+)\}?\}/g;

    let lastIndex = 0;
    let match;

    // Process component interpolation
    while ((match = componentRegex.exec(translation)) !== null) {
      const [fullMatch, componentKey, content] = match;
      const startIndex = match.index;

      // Add text before component
      if (startIndex > lastIndex) {
        const textContent = translation.slice(lastIndex, startIndex);
        if (textContent) {
          results.push({
            key: `text-${index++}`,
            type: 'text',
            content: textContent,
            index: results.length
          });
        }
      }

      // Add component
      const component = components[componentKey];
      if (component) {
        if (React.isValidElement(component)) {
          results.push({
            key: `component-${componentKey}-${index++}`,
            type: 'component',
            content: React.cloneElement(component, { key: `component-${componentKey}` }, content),
            index: results.length
          });
        } else {
          results.push({
            key: `component-${componentKey}-${index++}`,
            type: 'component',
            content: <Fragment key={`component-${componentKey}`}>{component}</Fragment>,
            index: results.length
          });
        }
      } else {
        // Fallback to text if component not found
        results.push({
          key: `text-fallback-${index++}`,
          type: 'text',
          content: content,
          index: results.length
        });
      }

      lastIndex = startIndex + fullMatch.length;
    }

    // Process self-closing components
    const remainingText = translation.slice(lastIndex);
    let selfClosingLastIndex = 0;
    
    while ((match = selfClosingRegex.exec(remainingText)) !== null) {
      const [fullMatch, componentKey] = match;
      const startIndex = match.index;

      // Add text before self-closing component
      if (startIndex > selfClosingLastIndex) {
        const textContent = remainingText.slice(selfClosingLastIndex, startIndex);
        if (textContent) {
          results.push({
            key: `text-${index++}`,
            type: 'text',
            content: textContent,
            index: results.length
          });
        }
      }

      // Add self-closing component
      const component = components[componentKey];
      if (component) {
        results.push({
          key: `component-${componentKey}-${index++}`,
          type: 'component',
          content: React.isValidElement(component) 
            ? React.cloneElement(component, { key: `component-${componentKey}` })
            : <Fragment key={`component-${componentKey}`}>{component}</Fragment>,
          index: results.length
        });
      }

      selfClosingLastIndex = startIndex + fullMatch.length;
    }

    // Add remaining text
    const finalText = remainingText.slice(selfClosingLastIndex);
    if (finalText) {
      results.push({
        key: `text-final-${index++}`,
        type: 'text',
        content: finalText,
        index: results.length
      });
    }

    // If no components were processed, add the full text
    if (results.length === 0) {
      results.push({
        key: `text-full-${index++}`,
        type: 'text',
        content: translation,
        index: 0
      });
    }

    return results;
  };

  const processInterpolation = (content: string): string => {
    return content.replace(/\{\{?(\w+)\}?\}/g, (match, key) => {
      return values[key] !== undefined ? String(values[key]) : match;
    });
  };

  const renderContent = (): ReactNode => {
    const translation = getTranslation();
    const parsed = parseTranslation(translation);

    const processedContent = parsed.map((item) => {
      if (item.type === 'text') {
        const processedText = processInterpolation(item.content as string);
        return shouldUnescape ? (
          <span 
            key={item.key}
            dangerouslySetInnerHTML={{ __html: processedText }}
          />
        ) : (
          processedText
        );
      }
      return item.content;
    });

    return processedContent.length === 1 ? processedContent[0] : processedContent;
  };

  const content = renderContent();

  // If parent is specified, wrap in parent element
  if (parent) {
    const ParentComponent = parent as React.ComponentType<any>;
    if (typeof parent === 'string') {
      return React.createElement(
        parent,
        { className, style },
        content
      );
    } else {
      return (
        <ParentComponent className={className} style={style}>
          {content}
        </ParentComponent>
      );
    }
  }

  // If className or style is provided, wrap in span
  if (className || style) {
    return (
      <span className={className} style={style}>
        {content}
      </span>
    );
  }

  // Return raw content
  return <>{content}</>;
};

export default Trans;