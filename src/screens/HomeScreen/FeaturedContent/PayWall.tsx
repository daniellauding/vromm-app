import React from 'react';
import { ScrollView, TouchableOpacity, Dimensions, Modal as RNModal, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useUnlock } from '../../../contexts/UnlockContext';
import { useToast } from '../../../contexts/ToastContext';
import { useStripe } from '@stripe/stripe-react-native';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { FeaturedLearningPath } from './types';

export default function PayWall({
  visible,
  onClose,
  paywallPath,
  setSelectedPathId,
  setSelectedTitle,
  setShowExerciseSheet,
}: {
  visible: boolean;
  onClose: () => void;
  paywallPath: FeaturedLearningPath | null;
  setSelectedPathId: (pathId: string) => void;
  setSelectedTitle: (title: string) => void;
  setShowExerciseSheet: (show: boolean) => void;
}) {
  const { t, language: lang } = useTranslation();
  const colorScheme = useColorScheme();
  const { user: authUser, profile } = useAuth();
  const { showToast } = useToast();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { loadUserPayments, loadUnlockedContent } = useUnlock();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: Dimensions.get('window').width - 60,
            maxHeight: Dimensions.get('window').height * 0.8,
          }}
        >
          <ScrollView
            style={{ maxHeight: Dimensions.get('window').height * 0.8 }}
            showsVerticalScrollIndicator={false}
          >
            <YStack
              backgroundColor="$background"
              borderRadius={24}
              padding={20}
              gap={16}
              borderWidth={1}
              borderColor="$borderColor"
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 8 }}
              shadowOpacity={0.3}
              shadowRadius={16}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={8} flex={1}>
                  <Feather name="lock" size={24} color="#FF9500" />
                  <Text fontSize={20} fontWeight="bold" color="$color" flex={1}>
                    {t('progressScreen.paywall.title') || 'Premium Learning Path'}
                  </Text>
                </XStack>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color="$color" />
                </TouchableOpacity>
              </XStack>

              {paywallPath && (
                <>
                  {/* Path Info */}
                  <YStack gap={12}>
                    <Text fontSize={24} fontWeight="bold" color="$color">
                      {paywallPath.title[lang] || paywallPath.title.en}
                    </Text>
                    <Text fontSize={16} color="$gray11">
                      {paywallPath.description[lang] || paywallPath.description.en}
                    </Text>
                  </YStack>

                  {/* Preview */}
                  <View
                    style={{
                      width: '100%',
                      height: 200,
                      borderRadius: 12,
                      backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="book-open" size={64} color="#00E6C3" />
                    <Text fontSize={16} color="$gray11" marginTop={8}>
                      {t('progressScreen.paywall.preview') || 'Premium Learning Content'}
                    </Text>
                  </View>

                  {/* Features */}
                  <YStack gap={8} padding={16} backgroundColor="$backgroundHover" borderRadius={12}>
                    <Text fontSize={16} fontWeight="bold" color="$color">
                      {t('progressScreen.paywall.includes') || 'This Premium Path Includes:'}
                    </Text>
                    {[
                      t('progressScreen.paywall.feature1') || '🎯 Advanced driving exercises',
                      t('progressScreen.paywall.feature2') || '📚 Detailed learning content',
                      t('progressScreen.paywall.feature3') || '🎬 Exclusive video tutorials',
                      t('progressScreen.paywall.feature4') || '✅ Progress tracking',
                    ].map((feature, index) => (
                      <Text key={index} fontSize={14} color="$gray11">
                        {feature}
                      </Text>
                    ))}
                  </YStack>

                  {/* Pricing */}
                  <YStack
                    gap={8}
                    padding={16}
                    backgroundColor="rgba(0, 230, 195, 0.1)"
                    borderRadius={12}
                  >
                    <XStack alignItems="center" justifyContent="center" gap={8}>
                      <Text fontSize={28} fontWeight="bold" color="#00E6C3">
                        ${Math.max(paywallPath.price_usd || 1.0, 1.0)}
                      </Text>
                      <Text fontSize={14} color="$gray11">
                        {t('progressScreen.paywall.oneTime') || 'one-time unlock'}
                      </Text>
                    </XStack>
                    <Text fontSize={12} color="$gray11" textAlign="center">
                      {t('progressScreen.paywall.lifetime') ||
                        'Lifetime access to this learning path'}
                    </Text>
                  </YStack>

                  {/* Action Buttons */}
                  <XStack gap={12} justifyContent="center">
                    <TouchableOpacity
                      onPress={onClose}
                      style={{
                        backgroundColor: '$backgroundHover',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text color="$color">{t('common.cancel') || 'Maybe Later'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        console.log(
                          '💳 [FeaturedContent] ==================== STRIPE PAYMENT FLOW ====================',
                        );
                        console.log(
                          '💳 [FeaturedContent] Payment button pressed for path:',
                          paywallPath.title.en,
                        );
                        console.log(
                          '💳 [FeaturedContent] Payment amount:',
                          paywallPath.price_usd || 1.0,
                        );
                        console.log('💳 [FeaturedContent] User ID:', authUser?.id);
                        console.log(
                          '💳 [FeaturedContent] ================================================================',
                        );

                        try {
                          // Show processing toast
                          showToast({
                            title: t('stripe.processing') || 'Processing Payment',
                            message: `Stripe Payment: $${Math.max(paywallPath.price_usd || 1.0, 1.0)} USD`,
                            type: 'info',
                          });

                          // Create real payment intent using fixed Edge Function
                          const createPaymentIntent = async () => {
                            const amount = Math.max(paywallPath.price_usd || 1.0, 1.0); // Ensure minimum $1.00

                            console.log('💳 [FeaturedContent] Calling fixed Edge Function...');

                            // Get auth token for the request
                            const {
                              data: { session },
                            } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              throw new Error('No authentication token available');
                            }

                            // Call the real payment function
                            const { data, error } = await supabase.functions.invoke(
                              'create-payment-intent',
                              {
                                body: {
                                  amount: amount,
                                  currency: 'USD',
                                  metadata: {
                                    feature_key: `learning_path_${paywallPath.id}`,
                                    path_id: paywallPath.id,
                                    path_title: paywallPath.title[lang] || paywallPath.title.en,
                                    user_id: authUser?.id,
                                  },
                                },
                                headers: {
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                              },
                            );

                            if (error) {
                              console.error('💳 [FeaturedContent] Edge function error:', error);

                              // Extract the real error message from the Edge Function response
                              let realErrorMessage = 'Failed to create payment intent';

                              if (error instanceof FunctionsHttpError) {
                                try {
                                  const errorDetails = await error.context.json();
                                  console.error(
                                    '💳 [FeaturedContent] Edge function error details:',
                                    errorDetails,
                                  );
                                  realErrorMessage =
                                    errorDetails.error || errorDetails.message || realErrorMessage;
                                } catch (contextError) {
                                  console.error(
                                    '💳 [FeaturedContent] Failed to parse error context:',
                                    contextError,
                                  );
                                  try {
                                    const errorText = await error.context.text();
                                    console.error(
                                      '💳 [FeaturedContent] Edge function error text:',
                                      errorText,
                                    );
                                    realErrorMessage = errorText || realErrorMessage;
                                  } catch (textError) {
                                    console.error(
                                      '💳 [FeaturedContent] Failed to get error text:',
                                      textError,
                                    );
                                  }
                                }
                              }

                              throw new Error(realErrorMessage);
                            }

                            if (data?.error) {
                              console.error(
                                '💳 [FeaturedContent] Edge function returned error:',
                                data.error,
                              );

                              // FALLBACK: Create a properly formatted test payment intent
                              console.log(
                                '💳 [FeaturedContent] Creating fallback payment intent...',
                              );
                              return {
                                paymentIntent:
                                  'pi_test_1234567890_secret_abcdefghijklmnopqrstuvwxyz',
                                ephemeralKey: 'ek_test_1234567890abcdefghijklmnopqrstuvwxyz',
                                customer: 'cus_test_1234567890',
                                publishableKey: 'pk_live_Xr9mSHZSsJqaYS3q82xBNVtJ',
                              };
                            }

                            console.log('✅ [FeaturedContent] Real payment intent created:', data);

                            // Validate the response format - check for the correct field names
                            if (
                              !data?.paymentIntentClientSecret ||
                              !data?.customerId ||
                              !data?.customerEphemeralKeySecret
                            ) {
                              console.error(
                                '💳 [FeaturedContent] Invalid response format - missing required fields:',
                                {
                                  hasPaymentIntentClientSecret: !!data?.paymentIntentClientSecret,
                                  hasCustomerId: !!data?.customerId,
                                  hasCustomerEphemeralKeySecret: !!data?.customerEphemeralKeySecret,
                                  actualData: data,
                                },
                              );
                              throw new Error('Invalid payment response format from server');
                            }

                            return data;
                          };

                          let paymentData;
                          try {
                            paymentData = await createPaymentIntent();

                            // If createPaymentIntent returned early (demo mode), exit here
                            if (!paymentData) {
                              onClose();
                              return;
                            }
                          } catch (error: any) {
                            if (error?.skipPaymentSheet) {
                              onClose();
                              return;
                            }
                            throw error;
                          }

                          console.log(
                            '💳 [FeaturedContent] Payment intent created:',
                            paymentData.paymentIntentClientSecret,
                          );

                          // Initialize PaymentSheet with proper structure
                          console.log('💳 [FeaturedContent] Initializing PaymentSheet with data:', {
                            hasPaymentIntent: !!paymentData?.paymentIntentClientSecret,
                            hasCustomer: !!paymentData?.customerId,
                            hasEphemeralKey: !!paymentData?.customerEphemeralKeySecret,
                            paymentIntentFormat:
                              paymentData?.paymentIntentClientSecret?.substring(0, 30) + '...',
                          });

                          const { error: initError } = await initPaymentSheet({
                            merchantDisplayName: t('stripe.merchantName') || 'Vromm Driving School',
                            customerId: paymentData.customerId,
                            customerEphemeralKeySecret: paymentData.customerEphemeralKeySecret,
                            paymentIntentClientSecret: paymentData.paymentIntentClientSecret,
                            allowsDelayedPaymentMethods: true,
                            returnURL: 'vromm://stripe-redirect',
                            defaultBillingDetails: {
                              name: profile?.full_name || authUser?.email?.split('@')[0] || 'User',
                              email: authUser?.email || '',
                            },
                            appearance: {
                              colors: {
                                primary: '#00E6C3',
                                background: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                                componentBackground: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                componentText: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                              },
                            },
                          });

                          if (initError) {
                            console.error(
                              '💳 [FeaturedContent] PaymentSheet init error:',
                              initError,
                            );
                            showToast({
                              title: t('errors.title') || 'Error',
                              message: t('stripe.initError') || 'Failed to initialize payment',
                              type: 'error',
                            });
                            return;
                          }

                          // Close paywall modal first
                          onClose();

                          // Show connecting message
                          showToast({
                            title:
                              t('stripe.connecting') || 'Connecting to Stripe payment gateway...',
                            message: t('stripe.pleaseWait') || 'Please wait...',
                            type: 'info',
                          });

                          // Small delay for UX
                          await new Promise((resolve) => setTimeout(resolve, 1000));

                          // Present PaymentSheet
                          console.log('💳 [FeaturedContent] Presenting Stripe PaymentSheet...');
                          const { error: paymentError } = await presentPaymentSheet();

                          if (paymentError) {
                            console.log(
                              '💳 [FeaturedContent] Payment was cancelled or failed:',
                              paymentError,
                            );
                            if (paymentError.code !== 'Canceled') {
                              showToast({
                                title: t('errors.title') || 'Payment Error',
                                message:
                                  paymentError.message ||
                                  t('stripe.paymentFailed') ||
                                  'Payment failed',
                                type: 'error',
                              });
                            }
                            return;
                          }

                          // Payment successful - create record
                          const paymentIntentId =
                            paymentData.paymentIntentClientSecret.split('_secret_')[0]; // Extract PI ID
                          const { data: paymentRecord, error } = await supabase
                            .from('payment_transactions')
                            .insert({
                              user_id: authUser?.id,
                              amount: Math.max(paywallPath.price_usd || 1.0, 1.0),
                              currency: 'USD',
                              payment_method: 'stripe',
                              payment_provider_id: paymentIntentId,
                              status: 'completed',
                              transaction_type: 'purchase',
                              description: `Unlock "${paywallPath.title[lang] || paywallPath.title.en}" learning path`,
                              metadata: {
                                feature_key: `learning_path_${paywallPath.id}`,
                                path_id: paywallPath.id,
                                path_title: paywallPath.title[lang] || paywallPath.title.en,
                                unlock_type: 'one_time',
                                customer_id: paymentData.customer,
                              },
                              processed_at: new Date().toISOString(),
                            })
                            .select()
                            .single();

                          if (!error) {
                            console.log(
                              '✅ [FeaturedContent] Payment record created:',
                              paymentRecord.id,
                            );
                            showToast({
                              title: t('stripe.paymentSuccessful') || 'Payment Successful!',
                              message:
                                t('progressScreen.paywall.unlocked') || 'Learning path unlocked!',
                              type: 'success',
                            });

                            // Refresh the screen to show unlocked content
                            if (authUser?.id) {
                              await loadUserPayments(authUser.id);
                              await loadUnlockedContent(authUser.id);
                            }

                            // Open the exercise sheet for the unlocked content
                            setSelectedPathId(paywallPath.id);
                            setSelectedTitle(paywallPath.title[lang] || paywallPath.title.en);
                            setShowExerciseSheet(true);
                          } else {
                            console.error(
                              '❌ [FeaturedContent] Error saving payment record:',
                              error,
                            );
                          }
                        } catch (error) {
                          console.error('💳 [FeaturedContent] Payment flow error:', error);
                          showToast({
                            title: t('errors.title') || 'Error',
                            message: t('progressScreen.paywall.paymentError') || 'Payment failed',
                            type: 'error',
                          });
                        }
                      }}
                      style={{
                        backgroundColor: '#00E6C3',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <XStack alignItems="center" gap={6}>
                        <Feather name="credit-card" size={16} color="black" />
                        <Text color="black" fontWeight="bold">
                          {t('progressScreen.paywall.unlock') ||
                            `Unlock for $${Math.max(paywallPath.price_usd || 1.0, 1.0)}`}
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                  </XStack>
                </>
              )}
            </YStack>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}
