import { Ionicons } from "@expo/vector-icons";
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AboutUsScreen() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:info@imcbs.com');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+919072791379');
  };

  const handleWebsite = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <MaskedView
          style={styles.titleMask}
          maskElement={
            <Text style={styles.headerTitle}>About Us</Text>
          }
        >
          <LinearGradient
            colors={['#fbd23c', '#ee7219', '#141bec']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          />
        </MaskedView>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#fbd23c', '#ee7219']}
            style={styles.logoCircle}
          >
            <Ionicons name="business" size={40} color="white" />
          </LinearGradient>
          
          <Text style={styles.companyName}>IMCB Solutions LLP</Text>
          <Text style={styles.tagline}>IMC Business Solutions</Text>
          <Text style={styles.since}>Delivering Excellence Since 2009</Text>
        </View>

        {/* Journey Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="rocket-outline" size={24} color="#ee7219" />
            <Text style={styles.sectionTitle}>Our Journey</Text>
          </View>
          <Text style={styles.description}>
            IMCB Solutions LLP, popularly known as IMC Business Solutions, is a Software development company in Wayanad. We've been delivering smart, tailored software and IT services since 2009 to help businesses grow and run efficiently.
          </Text>
          <Text style={styles.description}>
            From business software and mobile apps to web development, hardware solutions, and IT support—we provide everything needed to power success. We specialize in creating custom websites that not only look great but also drive real results.
          </Text>
        </View>

        {/* Vision Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#3B82F6', '#1E40AF']}
              style={styles.cardIcon}
            >
              <Ionicons name="eye-outline" size={24} color="white" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Our Vision</Text>
          </View>
          <Text style={styles.cardDescription}>
            To empower businesses through innovative, reliable technology and personalized support—driving digital growth and building lasting partnerships for a smarter, connected future.
          </Text>
        </View>

        {/* Mission Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardIcon}
            >
              <Ionicons name="flag-outline" size={24} color="white" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Our Mission</Text>
          </View>
          <Text style={styles.cardDescription}>
            Deliver innovative digital solutions that simplify processes and drive efficiency. Through collaboration and continuous improvement, we build trusted, long-term partnerships.
          </Text>
        </View>

        {/* Values Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardIcon}
            >
              <Ionicons name="heart-outline" size={24} color="white" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Our Values</Text>
          </View>
          <Text style={styles.cardDescription}>
            We value integrity, innovation, and long-term growth. Through expertise and smart solutions, we build trust and drive lasting success in a digital world.
          </Text>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="apps-outline" size={24} color="#ee7219" />
            <Text style={styles.sectionTitle}>Our Products</Text>
          </View>
          
          <View style={styles.productGrid}>
            <View style={styles.productItem}>
              <Text style={styles.productName}>TASK</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>SHADE</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>MAGNET</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>VTASK</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>DINE</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>STARSTAY</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>AURIC</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>FLAMES</Text>
            </View>
            <View style={styles.productItem}>
              <Text style={styles.productName}>RENTAL</Text>
            </View>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct-outline" size={24} color="#ee7219" />
            <Text style={styles.sectionTitle}>Our Services</Text>
          </View>
          
          <View style={styles.servicesList}>
            <View style={styles.serviceItem}>
              <Ionicons name="globe-outline" size={20} color="#3B82F6" />
              <Text style={styles.serviceText}>Website & Web Application</Text>
            </View>
            <View style={styles.serviceItem}>
              <Ionicons name="phone-portrait-outline" size={20} color="#10B981" />
              <Text style={styles.serviceText}>Mobile App Development</Text>
            </View>
            <View style={styles.serviceItem}>
              <Ionicons name="megaphone-outline" size={20} color="#F59E0B" />
              <Text style={styles.serviceText}>Digital Marketing</Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Get In Touch</Text>
          
          <TouchableOpacity style={styles.contactCard} onPress={() => handleWebsite('https://maps.google.com/?q=Palakkunnummal+Building+Kalpetta+Wayanad')}>
            <View style={styles.contactIcon}>
              <Ionicons name="location" size={24} color="#EC4899" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>
                Palakkunnummal Building, Near Govt Ayurveda Hospital{'\n'}
                Emily - Kalpetta, Wayanad{'\n'}
                Kerala - 673121
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={24} color="#3B82F6" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>info@imcbs.com</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handlePhone}>
            <View style={styles.contactIcon}>
              <Ionicons name="call" size={24} color="#10B981" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+91 9072791379</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 IMCB Solutions LLP. All rights reserved.
          </Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Terms & Conditions</Text>
            <Text style={styles.footerDivider}>•</Text>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerDivider}>•</Text>
            <Text style={styles.footerLink}>Refund Policy</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  
  header: {
    backgroundColor: "white",
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  
  titleMask: {
    height: 35,
    width: 150,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: "black",
    includeFontPadding: false,
  },
  
  gradientBackground: {
    flex: 1,
  },
  
  placeholder: {
    width: 40,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: 40,
  },
  
  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  companyName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
    textAlign: "center",
  },
  
  since: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  
  section: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 12,
  },
  
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4B5563",
    marginBottom: 12,
    textAlign: "justify",
  },
  
  card: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  
  cardDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4B5563",
    textAlign: "justify",
  },
  
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  
  productItem: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: "30%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  
  servicesList: {
    marginTop: 8,
  },
  
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  serviceText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },
  
  contactSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: "white",
    marginTop: 20,
  },
  
  contactTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  
  contactCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  contactInfo: {
    flex: 1,
    justifyContent: "center",
  },
  
  contactLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  
  contactValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    lineHeight: 20,
  },
  
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
  },
  
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
    textAlign: "center",
  },
  
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  
  footerLink: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  
  footerDivider: {
    fontSize: 12,
    color: "#D1D5DB",
    marginHorizontal: 8,
  },
});